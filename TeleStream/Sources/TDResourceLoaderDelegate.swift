import Foundation
import AVFoundation
import TDLibKit

final class TDResourceLoaderDelegate: NSObject, AVAssetResourceLoaderDelegate {
    private let tdClient: TDLibClient
    private let fileId: Int
    private var fileSize: Int64
    private let mimeType: String
    private let broadcaster: FileUpdateBroadcaster

    private let downloadWholeFirst: Bool
    private var pendingRequests = [AVAssetResourceLoadingRequest: Task<Void, Never>]()
    private let requestLock = NSLock()

    @MainActor
    init(fileId: Int, fileSize: Int64, mimeType: String = "video/mp4", client: TelegramClient) {
        self.tdClient = client.client
        self.fileId = fileId
        self.fileSize = fileSize
        self.mimeType = mimeType
        self.broadcaster = client.fileUpdateBroadcaster
        self.downloadWholeFirst = AppSettings.shared.downloadWholeFirst
        super.init()
    }

    func resourceLoader(
        _ resourceLoader: AVAssetResourceLoader,
        shouldWaitForLoadingOfRequestedResource loadingRequest: AVAssetResourceLoadingRequest
    ) -> Bool {
        guard let url = loadingRequest.request.url, url.scheme == "tdfile" else {
            return false
        }

        let task = Task { [weak self] in
            guard let self else { return }
            await self.processRequest(loadingRequest)
        }

        requestLock.lock()
        pendingRequests[loadingRequest] = task
        requestLock.unlock()

        return true
    }

    func resourceLoader(
        _ resourceLoader: AVAssetResourceLoader,
        didCancel loadingRequest: AVAssetResourceLoadingRequest
    ) {
        requestLock.lock()
        let task = pendingRequests.removeValue(forKey: loadingRequest)
        requestLock.unlock()
        task?.cancel()
    }

    private func processRequest(_ request: AVAssetResourceLoadingRequest) async {
        guard let dataRequest = request.dataRequest else {
            request.finishLoading(with: NSError(domain: "TDResourceLoader", code: -1))
            return
        }

        if self.fileSize <= 0 {
            if let file = try? await tdClient.getFile(fileId: fileId) {
                let s = Int64(file.size > 0 ? file.size : file.expectedSize)
                if s > 0 {
                    self.fileSize = s
                }
            }
        }

        let effectiveFileSize = self.fileSize > 0 ? self.fileSize : 500_000_000

        if let contentRequest = request.contentInformationRequest {
            contentRequest.isByteRangeAccessSupported = true
            let uti: String
            let lowerMime = mimeType.lowercased()
            if lowerMime.contains("quicktime") || lowerMime.contains("mov") {
                uti = AVFileType.mov.rawValue
            } else if lowerMime.contains("m4v") {
                uti = AVFileType.m4v.rawValue
            } else {
                uti = AVFileType.mp4.rawValue
            }
            contentRequest.contentType = uti
            contentRequest.contentLength = effectiveFileSize
        }

        let requestedOffset = dataRequest.requestedOffset
        let requestedLength = Int64(dataRequest.requestedLength)
        let end = min(requestedOffset + requestedLength, effectiveFileSize)

        var currentOffset = requestedOffset

        do {
            while currentOffset < end && !Task.isCancelled {
                let chunkSize = min(end - currentOffset, 1024 * 1024)

                let downloaded = try await downloadWithRetry(
                    offset: currentOffset,
                    limit: Int(chunkSize)
                )

                if downloaded == 0 {
                    try await Task.sleep(nanoseconds: 200_000_000)
                    continue
                }

                let file = try await tdClient.getFile(fileId: fileId)
                let localPath = file.local.path

                guard !localPath.isEmpty,
                      let fileHandle = FileHandle(forReadingAtPath: localPath) else {
                    try await Task.sleep(nanoseconds: 300_000_000)
                    continue
                }

                defer { fileHandle.closeFile() }
                try fileHandle.seek(toOffset: UInt64(currentOffset))
                let data = fileHandle.readData(ofLength: downloaded)

                if data.isEmpty {
                    try await Task.sleep(nanoseconds: 200_000_000)
                    continue
                }

                dataRequest.respond(with: data)
                currentOffset += Int64(data.count)
            }

            if !Task.isCancelled {
                request.finishLoading()
            }
        } catch {
            if !Task.isCancelled {
                request.finishLoading(with: error)
            }
        }

        requestLock.lock()
        pendingRequests.removeValue(forKey: request)
        requestLock.unlock()
    }

    private func downloadWithRetry(offset: Int64, limit: Int, maxRetries: Int = 3) async throws -> Int {
        var retries = 0

        while retries < maxRetries {
            if Task.isCancelled { return 0 }

            do {
                let dlOffset: Int64 = downloadWholeFirst ? 0 : offset
                let dlLimit: Int64 = downloadWholeFirst ? 0 : Int64(limit)

                let file = try await tdClient.downloadFile(
                    fileId: fileId,
                    limit: dlLimit,
                    offset: dlOffset,
                    priority: 32,
                    synchronous: false
                )

                let available = bytesAvailable(in: file, at: offset, length: limit)
                if available > 0 { return available }

                let result = await waitForBytes(at: offset, length: limit, timeout: 10.0)
                if result > 0 { return result }

                retries += 1
                if retries < maxRetries {
                    try await Task.sleep(nanoseconds: UInt64(retries) * 500_000_000)
                }
            } catch {
                retries += 1
                if retries >= maxRetries { throw error }
                try await Task.sleep(nanoseconds: UInt64(retries) * 500_000_000)
            }
        }

        return 0
    }

    private func waitForBytes(at offset: Int64, length: Int, timeout: Double) async -> Int {
        let stream = broadcaster.subscribe()
        let deadline = ContinuousClock.now + .seconds(timeout)

        for await file in stream {
            if Task.isCancelled { break }
            if ContinuousClock.now >= deadline { break }

            if file.id == fileId {
                let available = bytesAvailable(in: file, at: offset, length: length)
                if available > 0 { return available }
            }
        }

        if let file = try? await tdClient.getFile(fileId: fileId) {
            return bytesAvailable(in: file, at: offset, length: length)
        }

        return 0
    }

    private func bytesAvailable(in file: TDLibKit.File, at offset: Int64, length: Int) -> Int {
        if file.local.isDownloadingCompleted {
            return length
        }

        let downloadStart = Int64(file.local.downloadOffset)
        let downloadEnd = downloadStart + Int64(file.local.downloadedPrefixSize)

        if offset >= downloadStart && offset < downloadEnd {
            return Int(min(Int64(length), downloadEnd - offset))
        }

        return 0
    }
}
