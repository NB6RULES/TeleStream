import Foundation
import Network
import TDLibKit

@MainActor
public final class StreamTelemetry: ObservableObject {
    public static let shared = StreamTelemetry()
    @Published public var speedFormatted: String = "0 KB/s"
    @Published public var speedBytesPerSec: Double = 0
    @Published public var activeStreamsCount: Int = 0
    @Published public var totalBytesTransferred: Int64 = 0
    @Published public var lastChunkSize: Int = 0
    @Published public var isStreaming: Bool = false
}

final class LocalStreamServer: @unchecked Sendable {
    static let shared = LocalStreamServer()

    private var listener: NWListener?
    private(set) var port: UInt16 = 9123
    private var tdClient: TDLibClient?
    private var broadcaster: FileUpdateBroadcaster?
    private let lock = NSLock()
    private var activeConnections = [UUID: NWConnection]()
    private var isReady = false
    private var byteSamples: [(time: CFAbsoluteTime, bytes: Int)] = []
    private let samplesLock = NSLock()

    private init() {}

    func recordBytesTransferred(_ count: Int) {
        samplesLock.lock()
        let now = CFAbsoluteTimeGetCurrent()
        byteSamples.append((time: now, bytes: count))
        byteSamples.removeAll { now - $0.time > 2.0 }
        let totalBytes = byteSamples.reduce(0) { $0 + $1.bytes }
        let firstTime = byteSamples.first?.time ?? now
        let lastTime = byteSamples.last?.time ?? now
        let duration = max(0.5, lastTime - firstTime)
        let bps = Double(totalBytes) / duration
        samplesLock.unlock()

        let formatted = Self.formatSpeed(bps)
        Task { @MainActor in
            StreamTelemetry.shared.speedBytesPerSec = bps
            StreamTelemetry.shared.totalBytesTransferred += Int64(count)
            StreamTelemetry.shared.lastChunkSize = count
            StreamTelemetry.shared.isStreaming = true
            StreamTelemetry.shared.speedFormatted = formatted
        }
    }

    private static func formatSpeed(_ bytesPerSec: Double) -> String {
        if bytesPerSec < 1024 {
            return "\(Int(bytesPerSec)) B/s"
        } else if bytesPerSec < 1024 * 1024 {
            return String(format: "%.1f KB/s", bytesPerSec / 1024.0)
        } else {
            return String(format: "%.2f MB/s", bytesPerSec / (1024.0 * 1024.0))
        }
    }

    @MainActor
    func start(with client: TelegramClient) {
        lock.lock()
        self.tdClient = client.client
        self.broadcaster = client.fileUpdateBroadcaster
        let hasListener = listener != nil
        lock.unlock()
        guard !hasListener else { return }
        startListener(preferFixedPort: true)
    }

    /// (Re)creates the listener. iOS tears sockets down while the app is suspended and
    /// a fixed port can be briefly unavailable after a force-close, so on failure we
    /// fall back to an OS-assigned port instead of staying dead until the next launch.
    private func startListener(preferFixedPort: Bool) {
        let params = NWParameters.tcp
        params.allowLocalEndpointReuse = true

        let newListener: NWListener
        do {
            if preferFixedPort, let fixed = try? NWListener(using: params, on: NWEndpoint.Port(rawValue: 9123) ?? .any) {
                newListener = fixed
            } else {
                newListener = try NWListener(using: params, on: .any)
            }
        } catch {
            print("[LocalStreamServer] Init error: \(error)")
            return
        }

        lock.lock()
        self.listener = newListener
        lock.unlock()

        newListener.stateUpdateHandler = { [weak self, weak newListener] state in
            guard let self, let newListener else { return }
            switch state {
            case .ready:
                if let p = newListener.port?.rawValue {
                    self.lock.lock()
                    self.port = p
                    self.isReady = true
                    self.lock.unlock()
                    print("[LocalStreamServer] Listening on http://127.0.0.1:\(p)")
                }
            case .failed(let error):
                print("[LocalStreamServer] Failed: \(error) — restarting")
                self.lock.lock()
                let isCurrent = self.listener === newListener
                if isCurrent {
                    self.listener = nil
                    self.isReady = false
                }
                self.lock.unlock()
                newListener.cancel()
                if isCurrent {
                    DispatchQueue.global(qos: .userInitiated).asyncAfter(deadline: .now() + 0.2) {
                        self.startListener(preferFixedPort: false)
                    }
                }
            case .cancelled:
                self.lock.lock()
                if self.listener === newListener {
                    self.listener = nil
                    self.isReady = false
                }
                self.lock.unlock()
            default:
                break
            }
        }

        newListener.newConnectionHandler = { [weak self] connection in
            self?.handleConnection(connection)
        }

        newListener.start(queue: .global(qos: .userInitiated))
    }

    /// Ensures the server is listening and returns once it is ready (or after a short timeout).
    @MainActor
    func ensureRunning(with client: TelegramClient) async {
        start(with: client)
        for _ in 0..<40 {
            lock.lock()
            let ready = isReady && listener != nil
            lock.unlock()
            if ready { return }
            try? await Task.sleep(nanoseconds: 50_000_000)
            start(with: client)
        }
    }

    /// Called when the app returns to the foreground: a suspended listener is often dead.
    @MainActor
    func restartIfNeeded(with client: TelegramClient) {
        lock.lock()
        let current = listener
        let healthy: Bool
        if let current {
            if case .ready = current.state { healthy = true } else { healthy = false }
        } else {
            healthy = false
        }
        lock.unlock()
        if !healthy {
            current?.cancel()
            lock.lock()
            if listener === current { listener = nil; isReady = false }
            lock.unlock()
        }
        start(with: client)
    }

    func stop() {
        lock.lock()
        let l = listener
        listener = nil
        isReady = false
        let conns = Array(activeConnections.values)
        activeConnections.removeAll()
        lock.unlock()
        l?.cancel()
        for conn in conns {
            conn.cancel()
        }
    }

    func streamURL(fileId: Int, fileSize: Int64, fileName: String) -> URL {
        lock.lock()
        let p = port
        lock.unlock()
        var comps = URLComponents()
        comps.scheme = "http"
        comps.host = "127.0.0.1"
        comps.port = Int(p)
        comps.path = "/stream"
        // '&', '=', '+' and '#' are legal in a query but would break our parser.
        var allowed = CharacterSet.urlQueryAllowed
        allowed.remove(charactersIn: "&=+#?")
        let encodedName = fileName.addingPercentEncoding(withAllowedCharacters: allowed) ?? "video.mp4"
        comps.percentEncodedQuery = "fileId=\(fileId)&fileSize=\(fileSize)&name=\(encodedName)"
        return comps.url ?? URL(string: "http://127.0.0.1:\(p)/stream?fileId=\(fileId)&fileSize=\(fileSize)")!
    }

    private func isConnectionAlive(_ connectionId: UUID) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        return activeConnections[connectionId] != nil
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

    private func readRequest(connection: NWConnection, connectionId: UUID, buffer: Data = Data()) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { [weak self] content, _, isComplete, error in
            guard let self else { return }
            var data = buffer
            if let content { data.append(content) }

            if let headerEnd = data.range(of: Data("\r\n\r\n".utf8)) {
                let headerData = data.subdata(in: data.startIndex..<headerEnd.lowerBound)
                guard let requestString = String(data: headerData, encoding: .utf8) ?? String(data: headerData, encoding: .isoLatin1) else {
                    self.closeConnection(connectionId)
                    return
                }
                self.watchForClientClose(connection: connection, connectionId: connectionId)
                self.processHTTPRequest(requestString, connection: connection, connectionId: connectionId)
            } else if isComplete || error != nil || data.count > 64 * 1024 {
                self.closeConnection(connectionId)
            } else {
                self.readRequest(connection: connection, connectionId: connectionId, buffer: data)
            }
        }
    }

    /// AVPlayer / FFmpeg abort range requests by closing the socket. Notice that right
    /// away so we stop pulling data from Telegram for a request nobody is reading.
    private func watchForClientClose(connection: NWConnection, connectionId: UUID) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 4096) { [weak self] content, _, isComplete, error in
            guard let self else { return }
            if isComplete || error != nil {
                self.closeConnection(connectionId)
            } else if self.isConnectionAlive(connectionId) {
                _ = content
                self.watchForClientClose(connection: connection, connectionId: connectionId)
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

        // Parse Range header (supports "bytes=a-b", "bytes=a-" and suffix "bytes=-n")
        var startOffset: Int64 = 0
        var endOffset: Int64 = fileSize - 1
        var isRangeRequest = false

        for line in lines.dropFirst() {
            guard let colon = line.firstIndex(of: ":") else { continue }
            let name = line[..<colon].trimmingCharacters(in: .whitespaces).lowercased()
            guard name == "range" else { continue }
            let value = line[line.index(after: colon)...].trimmingCharacters(in: .whitespaces)
            guard value.lowercased().hasPrefix("bytes=") else { continue }
            let spec = value.dropFirst(6).split(separator: ",").first.map(String.init) ?? ""
            let rangeParts = spec.split(separator: "-", maxSplits: 1, omittingEmptySubsequences: false).map {
                $0.trimmingCharacters(in: .whitespaces)
            }
            guard rangeParts.count == 2 else { continue }
            isRangeRequest = true
            if rangeParts[0].isEmpty {
                if let suffix = Int64(rangeParts[1]), suffix > 0 {
                    startOffset = max(0, fileSize - suffix)
                }
            } else if let s = Int64(rangeParts[0]) {
                startOffset = s
                if !rangeParts[1].isEmpty, let e = Int64(rangeParts[1]) {
                    endOffset = min(e, fileSize - 1)
                }
            }
        }

        if startOffset >= fileSize || startOffset > endOffset {
            sendResponse(connection: connection, header: "HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */\(fileSize)\r\nContent-Length: 0\r\nConnection: close\r\n\r\n", body: nil) {
                self.closeConnection(connectionId)
            }
            return
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
        lock.lock()
        let tdClientOpt = self.tdClient
        lock.unlock()
        guard let tdClient = tdClientOpt else {
            closeConnection(connectionId)
            return
        }

        let wholeFirst = await MainActor.run { AppSettings.shared.downloadWholeFirst }
        var currentOffset = startOffset
        let maxChunk: Int64 = 512 * 1024
        var errorCount = 0
        var lastRequestedOffset: Int64 = -1
        var lastProgressTime = CFAbsoluteTimeGetCurrent()
        var stallStart: CFAbsoluteTime? = nil

        while currentOffset <= endOffset {
            guard isConnectionAlive(connectionId) else { break }

            do {
                // Ask TDLib how many contiguous bytes exist *at this exact offset*.
                // (The old check compared against downloadedPrefixSize as if it were
                // measured from 0; it is measured from download_offset, so after a
                // restart we could "find" bytes that were never downloaded and feed
                // zeros to the player.)
                var available = try await tdClient.getFileDownloadedPrefixSize(fileId: fileId, offset: currentOffset).size

                if available <= 0 {
                    // (Re)start the download at our offset when nothing is coming in —
                    // either first request, or another connection moved TDLib elsewhere.
                    let now = CFAbsoluteTimeGetCurrent()
                    if lastRequestedOffset != currentOffset || now - lastProgressTime > 1.5 {
                        let dlOffset: Int64 = wholeFirst ? 0 : currentOffset
                        let dlLimit: Int64 = wholeFirst ? 0 : (endOffset - currentOffset + 1)
                        _ = try await tdClient.downloadFile(
                            fileId: fileId,
                            limit: dlLimit,
                            offset: dlOffset,
                            priority: 32,
                            synchronous: false
                        )
                        lastRequestedOffset = currentOffset
                        lastProgressTime = now
                    }
                    if stallStart == nil { stallStart = now }
                    if let st = stallStart, now - st > 90 {
                        print("[LocalStreamServer] No data for 90s at offset \(currentOffset), giving up")
                        break
                    }
                    try await Task.sleep(nanoseconds: 80_000_000)
                    continue
                }

                stallStart = nil
                available = min(available, endOffset - currentOffset + 1, maxChunk)

                let data = try await readBytes(tdClient: tdClient, fileId: fileId, offset: currentOffset, count: available)
                guard !data.isEmpty else {
                    try await Task.sleep(nanoseconds: 100_000_000)
                    continue
                }

                let sendSuccess: Bool = await withCheckedContinuation { continuation in
                    connection.send(content: data, completion: .contentProcessed { error in
                        continuation.resume(returning: error == nil)
                    })
                }
                if !sendSuccess { break }

                self.recordBytesTransferred(data.count)
                currentOffset += Int64(data.count)
                lastProgressTime = CFAbsoluteTimeGetCurrent()
                errorCount = 0
            } catch {
                errorCount += 1
                if errorCount > 15 { break }
                try? await Task.sleep(nanoseconds: 300_000_000)
            }
        }

        closeConnection(connectionId)
    }

    /// Reads bytes that TDLib reported as present. Uses the file on disk directly and
    /// falls back to TDLib's readFilePart if the path moved (e.g. download finished).
    private func readBytes(tdClient: TDLibClient, fileId: Int, offset: Int64, count: Int64) async throws -> Data {
        let file = try await tdClient.getFile(fileId: fileId)
        let path = file.local.path
        if !path.isEmpty, let handle = try? FileHandle(forReadingFrom: URL(fileURLWithPath: path)) {
            defer { try? handle.close() }
            do {
                try handle.seek(toOffset: UInt64(offset))
                if let data = try handle.read(upToCount: Int(count)), !data.isEmpty {
                    return data
                }
            } catch {
                // fall through to TDLib read
            }
        }
        let part = try await tdClient.readFilePart(count: count, fileId: fileId, offset: offset)
        return part.data
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
