import Foundation
import SwiftUI
import Combine

struct GitHubRelease: Codable {
    let tagName: String
    let name: String?
    let body: String?
    let htmlUrl: String?
    let assets: [GitHubAsset]

    enum CodingKeys: String, CodingKey {
        case tagName = "tag_name"
        case name
        case body
        case htmlUrl = "html_url"
        case assets
    }
}

struct GitHubAsset: Codable {
    let name: String
    let browserDownloadUrl: String
    let size: Int64

    enum CodingKeys: String, CodingKey {
        case name
        case browserDownloadUrl = "browser_download_url"
        case size
    }
}

@MainActor
final class IPADownloader: NSObject, ObservableObject, URLSessionDownloadDelegate {
    static let shared = IPADownloader()

    @Published var isChecking = false
    @Published var isDownloading = false
    @Published var progress: Double = 0.0
    @Published var bytesWritten: Int64 = 0
    @Published var totalBytesExpected: Int64 = 0
    @Published var downloadSpeed: String = "0 KB/s"
    @Published var latestRelease: GitHubRelease?
    @Published var latestIPAAsset: GitHubAsset?
    @Published var downloadedFileURL: URL?
    @Published var errorMessage: String?
    @Published var showShareSheet = false
    @Published var isUpdateAvailable = false
    @Published var isUpdateNotificationDismissed = false

    var currentVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }

    func isNewerVersion(remoteTag: String) -> Bool {
        let cleanRemote = remoteTag.trimmingCharacters(in: CharacterSet(charactersIn: "vV")).trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanCurrent = currentVersion.trimmingCharacters(in: CharacterSet(charactersIn: "vV")).trimmingCharacters(in: .whitespacesAndNewlines)

        if cleanRemote == cleanCurrent { return false }

        let remoteParts = cleanRemote.split(separator: ".").compactMap { Int($0) }
        let currentParts = cleanCurrent.split(separator: ".").compactMap { Int($0) }

        if remoteParts.isEmpty || currentParts.isEmpty {
            return cleanRemote != cleanCurrent
        }

        let maxCount = max(remoteParts.count, currentParts.count)
        for i in 0..<maxCount {
            let r = i < remoteParts.count ? remoteParts[i] : 0
            let c = i < currentParts.count ? currentParts[i] : 0
            if r > c { return true }
            if r < c { return false }
        }
        return false
    }

    func dismissNotification() {
        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            isUpdateNotificationDismissed = true
        }
    }

    private var downloadTask: URLSessionDownloadTask?
    private var session: URLSession?
    private var lastSampleTime: CFAbsoluteTime = 0
    private var lastBytesWritten: Int64 = 0

    override init() {
        super.init()
        let config = URLSessionConfiguration.default
        self.session = URLSession(configuration: config, delegate: self, delegateQueue: .main)
    }

    func checkForUpdates() async {
        isChecking = true
        errorMessage = nil
        defer { isChecking = false }

        guard let url = URL(string: "https://api.github.com/repos/NB6RULES/TeleStream/releases/latest") else {
            return
        }

        var request = URLRequest(url: url)
        request.setValue("application/vnd.github.v3+json", forHTTPHeaderField: "Accept")
        request.setValue("TeleStream-iOS-App", forHTTPHeaderField: "User-Agent")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            if let httpRes = response as? HTTPURLResponse, httpRes.statusCode == 200 {
                let release = try JSONDecoder().decode(GitHubRelease.self, from: data)
                self.latestRelease = release
                self.latestIPAAsset = release.assets.first(where: { $0.name.lowercased().hasSuffix(".ipa") })
                self.isUpdateAvailable = self.isNewerVersion(remoteTag: release.tagName)
            } else {
                // Fallback to default direct asset
                self.latestIPAAsset = GitHubAsset(
                    name: "TeleStream.ipa",
                    browserDownloadUrl: "https://github.com/NB6RULES/TeleStream/releases/latest/download/TeleStream.ipa",
                    size: 0
                )
            }
        } catch {
            print("GitHub release check failed: \(error)")
            self.latestIPAAsset = GitHubAsset(
                name: "TeleStream.ipa",
                browserDownloadUrl: "https://github.com/NB6RULES/TeleStream/releases/latest/download/TeleStream.ipa",
                size: 0
            )
        }
    }

    func startDownload() {
        guard !isDownloading else { return }

        let downloadUrlStr = latestIPAAsset?.browserDownloadUrl ?? "https://github.com/NB6RULES/TeleStream/releases/latest/download/TeleStream.ipa"
        guard let downloadUrl = URL(string: downloadUrlStr) else {
            errorMessage = "Invalid download URL"
            return
        }

        errorMessage = nil
        isDownloading = true
        progress = 0.0
        bytesWritten = 0
        totalBytesExpected = latestIPAAsset?.size ?? 0
        downloadSpeed = "Connecting..."
        downloadedFileURL = nil
        lastSampleTime = CFAbsoluteTimeGetCurrent()
        lastBytesWritten = 0

        var request = URLRequest(url: downloadUrl)
        request.setValue("TeleStream-iOS-App", forHTTPHeaderField: "User-Agent")

        downloadTask = session?.downloadTask(with: request)
        downloadTask?.resume()
    }

    func cancelDownload() {
        downloadTask?.cancel()
        downloadTask = nil
        isDownloading = false
        downloadSpeed = "Cancelled"
    }

    // MARK: - URLSessionDownloadDelegate

    nonisolated func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData bytesWritten: Int64, totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64) {
        Task { @MainActor in
            self.bytesWritten = totalBytesWritten
            let expected = totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : (self.latestIPAAsset?.size ?? 0)
            self.totalBytesExpected = expected

            if expected > 0 {
                self.progress = min(1.0, Double(totalBytesWritten) / Double(expected))
            } else {
                self.progress = 0.5
            }

            let now = CFAbsoluteTimeGetCurrent()
            let delta = now - self.lastSampleTime
            if delta >= 0.5 {
                let deltaBytes = totalBytesWritten - self.lastBytesWritten
                let speedBps = Double(deltaBytes) / delta
                self.downloadSpeed = Self.formatSpeed(speedBps)
                self.lastSampleTime = now
                self.lastBytesWritten = totalBytesWritten
            }
        }
    }

    nonisolated func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        let fileManager = FileManager.default
        let tempDir = fileManager.temporaryDirectory
        let destinationURL = tempDir.appendingPathComponent("TeleStream.ipa")

        try? fileManager.removeItem(at: destinationURL)
        do {
            try fileManager.moveItem(at: location, to: destinationURL)
            Task { @MainActor in
                self.isDownloading = false
                self.progress = 1.0
                self.downloadedFileURL = destinationURL
                self.downloadSpeed = "Complete"
                self.showShareSheet = true
            }
        } catch {
            Task { @MainActor in
                self.isDownloading = false
                self.errorMessage = "Failed to save IPA: \(error.localizedDescription)"
            }
        }
    }

    nonisolated func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error, (error as NSError).code != NSURLErrorCancelled {
            Task { @MainActor in
                self.isDownloading = false
                self.errorMessage = "Download failed: \(error.localizedDescription)"
            }
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

    static func formatBytes(_ bytes: Int64) -> String {
        guard bytes > 0 else { return "0 MB" }
        let mb = Double(bytes) / (1024 * 1024)
        if mb >= 1024 { return String(format: "%.1f GB", mb / 1024) }
        return String(format: "%.1f MB", mb)
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]
    let applicationActivities: [UIActivity]? = nil

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: applicationActivities)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
