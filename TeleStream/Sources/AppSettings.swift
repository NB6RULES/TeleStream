import Foundation

@MainActor
class AppSettings: ObservableObject {
    static let shared = AppSettings()

    @Published var maxCachedVideos: Int {
        didSet { UserDefaults.standard.set(maxCachedVideos, forKey: "maxCachedVideos") }
    }
    @Published var downloadWholeFirst: Bool {
        didSet { UserDefaults.standard.set(downloadWholeFirst, forKey: "downloadWholeFirst") }
    }
    @Published var autoNextEpisode: Bool {
        didSet { UserDefaults.standard.set(autoNextEpisode, forKey: "autoNextEpisode") }
    }
    @Published var hideClipsBelowMB: Int {
        didSet { UserDefaults.standard.set(hideClipsBelowMB, forKey: "hideClipsBelowMB") }
    }

    // Continue watching positions: [fileId: position in seconds]
    @Published var playbackPositions: [Int: Double] {
        didSet {
            if let data = try? JSONEncoder().encode(playbackPositions) {
                UserDefaults.standard.set(data, forKey: "playbackPositions")
            }
        }
    }

    // Continue watching metadata: [fileId: VideoMeta]
    @Published var continueWatching: [ContinueWatchingItem] {
        didSet {
            if let data = try? JSONEncoder().encode(continueWatching) {
                UserDefaults.standard.set(data, forKey: "continueWatching")
            }
        }
    }

    init() {
        let defaults = UserDefaults.standard
        self.maxCachedVideos = defaults.object(forKey: "maxCachedVideos") as? Int ?? 3
        self.downloadWholeFirst = defaults.bool(forKey: "downloadWholeFirst")
        self.autoNextEpisode = defaults.object(forKey: "autoNextEpisode") as? Bool ?? true
        self.hideClipsBelowMB = defaults.object(forKey: "hideClipsBelowMB") as? Int ?? 0

        if let data = defaults.data(forKey: "playbackPositions"),
           let positions = try? JSONDecoder().decode([Int: Double].self, from: data) {
            self.playbackPositions = positions
        } else {
            self.playbackPositions = [:]
        }

        if let data = defaults.data(forKey: "continueWatching"),
           let items = try? JSONDecoder().decode([ContinueWatchingItem].self, from: data) {
            self.continueWatching = items
        } else {
            self.continueWatching = []
        }
    }

    func savePosition(fileId: Int, position: Double, fileName: String, chatId: Int64, chatTitle: String, duration: Int) {
        playbackPositions[fileId] = position

        // Update continue watching list
        continueWatching.removeAll { $0.fileId == fileId }
        let notAtEnd = duration <= 0 || position < Double(duration) - 5
        if position > 2 && notAtEnd {
            let item = ContinueWatchingItem(
                fileId: fileId,
                fileName: fileName,
                chatId: chatId,
                chatTitle: chatTitle,
                position: position,
                duration: duration,
                lastWatched: Date().timeIntervalSince1970
            )
            continueWatching.insert(item, at: 0)
            if continueWatching.count > 50 {
                continueWatching = Array(continueWatching.prefix(50))
            }
        }
    }

    func clearPosition(fileId: Int) {
        playbackPositions.removeValue(forKey: fileId)
        continueWatching.removeAll { $0.fileId == fileId }
    }

    func clearAllPositions() {
        playbackPositions = [:]
        continueWatching = []
    }
}

struct ContinueWatchingItem: Codable, Identifiable {
    let fileId: Int
    let fileName: String
    let chatId: Int64
    let chatTitle: String
    let position: Double
    let duration: Int
    let lastWatched: Double

    var id: Int { fileId }

    var progress: Double {
        guard duration > 0 else { return 0 }
        return position / Double(duration)
    }
}
