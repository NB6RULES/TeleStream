import Foundation
import Network
import TDLibKit

final class LocalStreamServer: @unchecked Sendable {
    static let shared = LocalStreamServer()

    private var listener: NWListener?
    private(set) var port: UInt16 = 0
    private var client: TelegramClient?
    private let lock = NSLock()
    private var activeConnections = [UUID: NWConnection]()

    private init() {}

    func start(with client: TelegramClient) {
        self.client = client
        guard listener == nil else { return }

        do {
            let params = NWParameters.tcp
            params.allowLocalEndpointReuse = true
            let listener = try NWListener(using: params, on: .any)
            self.listener = listener

            listener.stateUpdateHandler = { [weak self] state in
                guard let self else { return }
                switch state {
                case .ready:
                    if let p = listener.port?.rawValue {
                        self.port = p
                        print("[LocalStreamServer] Listening on http://127.0.0.1:\(p)")
                    }
                case .failed(let error):
                    print("[LocalStreamServer] Failed: \(error)")
                    self.stop()
                default:
                    break
                }
            }

            listener.newConnectionHandler = { [weak self] connection in
                self?.handleConnection(connection)
            }

            listener.start(queue: .global(qos: .userInitiated))
        } catch {
            print("[LocalStreamServer] Init error: \(error)")
        }
    }

    func stop() {
        listener?.cancel()
        listener = nil
        lock.lock()
        for (_, conn) in activeConnections {
            conn.cancel()
        }
        activeConnections.removeAll()
        lock.unlock()
    }

    func streamURL(fileId: Int, fileSize: Int64, fileName: String) -> URL {
        let encodedName = fileName.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "video.mp4"
        let portNum = port > 0 ? port : 8080
        return URL(string: "http://127.0.0.1:\(portNum)/stream?fileId=\(fileId)&fileSize=\(fileSize)&name=\(encodedName)")!
    }

    private func handleConnection(_ connection: NWConnection) {
        let connectionId = UUID()
        lock.lock()
        activeConnections[connectionId] = connection
        lock.unlock()

        connection.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                self?.readRequest(connection: connection, connectionId: connectionId)
            case .cancelled, .failed:
                self?.closeConnection(connectionId)
            default:
                break
            }
        }

        connection.start(queue: .global(qos: .userInitiated))
    }

    private func closeConnection(_ connectionId: UUID) {
        lock.lock()
        if let conn = activeConnections.removeValue(forKey: connectionId) {
            conn.cancel()
        }
        lock.unlock()
    }

    private func readRequest(connection: NWConnection, connectionId: UUID) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 4096) { [weak self] content, _, isComplete, error in
            guard let self else { return }
            if let data = content, let requestString = String(data: data, encoding: .utf8) {
                self.processHTTPRequest(requestString, connection: connection, connectionId: connectionId)
            } else if isComplete || error != nil {
                self.closeConnection(connectionId)
            }
        }
    }

    private func processHTTPRequest(_ request: String, connection: NWConnection, connectionId: UUID) {
        let lines = request.components(separatedBy: "\r\n")
        guard let requestLine = lines.first else {
            closeConnection(connectionId)
            return
        }

        let parts = requestLine.components(separatedBy: " ")
        guard parts.count >= 2, parts[0] == "GET" || parts[0] == "HEAD" else {
            sendResponse(connection: connection, header: "HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\n\r\n", body: nil) {
                self.closeConnection(connectionId)
            }
            return
        }

        let isHead = parts[0] == "HEAD"
        let path = parts[1]
        guard let urlComponents = URLComponents(string: "http://localhost" + path),
              let queryItems = urlComponents.queryItems else {
            sendResponse(connection: connection, header: "HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n", body: nil) {
                self.closeConnection(connectionId)
            }
            return
        }

        let fileIdStr = queryItems.first(where: { $0.name == "fileId" })?.value ?? "0"
        let fileSizeStr = queryItems.first(where: { $0.name == "fileSize" })?.value ?? "0"
        let fileName = queryItems.first(where: { $0.name == "name" })?.value ?? "video.mp4"

        guard let fileId = Int(fileIdStr), let fileSize = Int64(fileSizeStr), fileSize > 0 else {
            sendResponse(connection: connection, header: "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n", body: nil) {
                self.closeConnection(connectionId)
            }
            return
        }

        // Parse Range header
        var startOffset: Int64 = 0
        var endOffset: Int64 = fileSize - 1
        var isRangeRequest = false

        for line in lines {
            if line.lowercased().hasPrefix("range:") {
                isRangeRequest = true
                let rangeValue = line.replacingOccurrences(of: "range:", with: "", options: .caseInsensitive)
                    .trimmingCharacters(in: .whitespaces)
                if rangeValue.hasPrefix("bytes=") {
                    let byteRange = rangeValue.replacingOccurrences(of: "bytes=", with: "")
                    let rangeParts = byteRange.components(separatedBy: "-")
                    if let s = Int64(rangeParts[0]) {
                        startOffset = s
                    }
                    if rangeParts.count > 1 && !rangeParts[1].isEmpty, let e = Int64(rangeParts[1]) {
                        endOffset = min(e, fileSize - 1)
                    }
                }
            }
        }

        let mimeType = mimeTypeFor(fileName: fileName)
        let contentLength = endOffset - startOffset + 1

        let header: String
        if isRangeRequest {
            header = "HTTP/1.1 206 Partial Content\r\n" +
                     "Accept-Ranges: bytes\r\n" +
                     "Content-Range: bytes \(startOffset)-\(endOffset)/\(fileSize)\r\n" +
                     "Content-Length: \(contentLength)\r\n" +
                     "Content-Type: \(mimeType)\r\n" +
                     "Connection: close\r\n\r\n"
        } else {
            header = "HTTP/1.1 200 OK\r\n" +
                     "Accept-Ranges: bytes\r\n" +
                     "Content-Length: \(fileSize)\r\n" +
                     "Content-Type: \(mimeType)\r\n" +
                     "Connection: close\r\n\r\n"
        }

        if isHead {
            sendResponse(connection: connection, header: header, body: nil) {
                self.closeConnection(connectionId)
            }
            return
        }

        // Send header first
        guard let headerData = header.data(using: .utf8) else {
            closeConnection(connectionId)
            return
        }

        connection.send(content: headerData, completion: .contentProcessed { [weak self] error in
            guard let self else { return }
            if error != nil {
                self.closeConnection(connectionId)
                return
            }
            // Stream chunks
            Task {
                await self.streamFileChunks(
                    fileId: fileId,
                    startOffset: startOffset,
                    endOffset: endOffset,
                    fileSize: fileSize,
                    connection: connection,
                    connectionId: connectionId
                )
            }
        })
    }

    private func streamFileChunks(
        fileId: Int,
        startOffset: Int64,
        endOffset: Int64,
        fileSize: Int64,
        connection: NWConnection,
        connectionId: UUID
    ) async {
        guard let tdClient = client else {
            closeConnection(connectionId)
            return
        }

        var currentOffset = startOffset
        let chunkSize: Int64 = 1024 * 1024 // 1MB chunks

        while currentOffset <= endOffset {
            lock.lock()
            let isAlive = activeConnections[connectionId] != nil
            lock.unlock()
            guard isAlive else { break }

            let bytesToRead = Int(min(chunkSize, endOffset - currentOffset + 1))

            do {
                // Request download chunk from TDLib
                let file = try await tdClient.downloadFile(
                    fileId: fileId,
                    limit: Int64(bytesToRead),
                    offset: currentOffset,
                    priority: 32,
                    synchronous: false
                )

                let available = bytesAvailable(in: file, at: currentOffset, length: bytesToRead)
                var downloaded = available
                if downloaded == 0 {
                    downloaded = await waitForBytes(in: tdClient, at: currentOffset, length: bytesToRead, timeout: 12.0)
                }

                if downloaded == 0 {
                    try await Task.sleep(nanoseconds: 200_000_000)
                    continue
                }

                let currentFile = try await tdClient.getFile(fileId: fileId)
                let path = currentFile.local.path
                guard !path.isEmpty, let fileHandle = FileHandle(forReadingAtPath: path) else {
                    try await Task.sleep(nanoseconds: 200_000_000)
                    continue
                }

                try fileHandle.seek(toOffset: UInt64(currentOffset))
                let data = fileHandle.readData(ofLength: downloaded)
                fileHandle.closeFile()

                guard !data.isEmpty else {
                    try await Task.sleep(nanoseconds: 200_000_000)
                    continue
                }

                let sendSuccess: Bool = await withCheckedContinuation { continuation in
                    connection.send(content: data, completion: .contentProcessed { error in
                        continuation.resume(returning: error == nil)
                    })
                }

                if !sendSuccess {
                    break
                }

                currentOffset += Int64(data.count)
            } catch {
                break
            }
        }

        closeConnection(connectionId)
    }

    private func bytesAvailable(in file: TDLibKit.File, at offset: Int64, length: Int) -> Int {
        if file.local.isDownloadingCompleted {
            return length
        }
        let prefix = Int64(file.local.downloadedPrefixSize)
        if prefix > 0 && offset < prefix {
            return Int(min(Int64(length), prefix - offset))
        }
        let chunkStart = Int64(file.local.downloadOffset)
        let chunkEnd = chunkStart + prefix
        if prefix > 0 && offset >= chunkStart && offset < chunkEnd {
            return Int(min(Int64(length), chunkEnd - offset))
        }
        return 0
    }

    private func waitForBytes(in client: TelegramClient, at offset: Int64, length: Int, timeout: Double) async -> Int {
        let stream = client.subscribeToFileUpdates()
        let deadline = ContinuousClock.now + .seconds(timeout)

        for await file in stream {
            if ContinuousClock.now >= deadline { break }
            let avail = bytesAvailable(in: file, at: offset, length: length)
            if avail > 0 {
                return avail
            }
        }
        return 0
    }

    private func sendResponse(connection: NWConnection, header: String, body: Data?, completion: @escaping () -> Void) {
        var data = header.data(using: .utf8) ?? Data()
        if let body {
            data.append(body)
        }
        connection.send(content: data, completion: .contentProcessed { _ in
            completion()
        })
    }

    private func mimeTypeFor(fileName: String) -> String {
        let ext = (fileName as NSString).pathExtension.lowercased()
        switch ext {
        case "mkv": return "video/x-matroska"
        case "avi": return "video/x-msvideo"
        case "ts": return "video/mp2t"
        case "mov": return "video/quicktime"
        case "m4v": return "video/x-m4v"
        case "webm": return "video/webm"
        case "flv": return "video/x-flv"
        case "wmv": return "video/x-ms-wmv"
        default: return "video/mp4"
        }
    }
}
