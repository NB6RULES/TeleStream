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

    func savePosition(fileId: Int, fileSize: Int64 = 0, position: Double, fileName: String, chatId: Int64, chatTitle: String, duration: Int) {
        playbackPositions[fileId] = position

        // Update continue watching list
        continueWatching.removeAll { $0.fileId == fileId }
        let notAtEnd = duration <= 0 || position < Double(duration) - 5
        if position > 2 && notAtEnd {
            let item = ContinueWatchingItem(
                fileId: fileId,
                fileSize: fileSize,
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
    var fileSize: Int64
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

    enum CodingKeys: String, CodingKey {
        case fileId, fileSize, fileName, chatId, chatTitle, position, duration, lastWatched
    }

    init(fileId: Int, fileSize: Int64 = 0, fileName: String, chatId: Int64, chatTitle: String, position: Double, duration: Int, lastWatched: Double) {
        self.fileId = fileId
        self.fileSize = fileSize
        self.fileName = fileName
        self.chatId = chatId
        self.chatTitle = chatTitle
        self.position = position
        self.duration = duration
        self.lastWatched = lastWatched
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.fileId = try container.decode(Int.self, forKey: .fileId)
        self.fileSize = try container.decodeIfPresent(Int64.self, forKey: .fileSize) ?? 0
        self.fileName = try container.decode(String.self, forKey: .fileName)
        self.chatId = try container.decode(Int64.self, forKey: .chatId)
        self.chatTitle = try container.decode(String.self, forKey: .chatTitle)
        self.position = try container.decode(Double.self, forKey: .position)
        self.duration = try container.decode(Int.self, forKey: .duration)
        self.lastWatched = try container.decode(Double.self, forKey: .lastWatched)
    }
}
