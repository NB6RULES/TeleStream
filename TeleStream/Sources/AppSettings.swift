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

    func savePosition(fileId: Int, fileSize: Int64 = 0, position: Double, fileName: String, chatId: Int64, chatTitle: String, duration: Int, thumbnailFileId: Int? = nil) {
        playbackPositions[fileId] = position

        // Update continue watching list
        let existingThumb = continueWatching.first(where: { $0.fileId == fileId })?.thumbnailFileId
        let thumbId = thumbnailFileId ?? existingThumb
        continueWatching.removeAll { $0.fileId == fileId }

        let item = ContinueWatchingItem(
            fileId: fileId,
            fileSize: fileSize,
            fileName: fileName,
            chatId: chatId,
            chatTitle: chatTitle,
            position: position,
            duration: duration,
            lastWatched: Date().timeIntervalSince1970,
            thumbnailFileId: thumbId
        )
        continueWatching.insert(item, at: 0)
        if continueWatching.count > 100 {
            continueWatching = Array(continueWatching.prefix(100))
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
    var position: Double
    let duration: Int
    let lastWatched: Double
    var thumbnailFileId: Int?

    var id: Int { fileId }

    var progress: Double {
        guard duration > 0 else { return 0 }
        return position / Double(duration)
    }

    enum CodingKeys: String, CodingKey {
        case fileId, fileSize, fileName, chatId, chatTitle, position, duration, lastWatched, thumbnailFileId
    }

    init(fileId: Int, fileSize: Int64 = 0, fileName: String, chatId: Int64, chatTitle: String, position: Double, duration: Int, lastWatched: Double, thumbnailFileId: Int? = nil) {
        self.fileId = fileId
        self.fileSize = fileSize
        self.fileName = fileName
        self.chatId = chatId
        self.chatTitle = chatTitle
        self.position = position
        self.duration = duration
        self.lastWatched = lastWatched
        self.thumbnailFileId = thumbnailFileId
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        fileId = try c.decode(Int.self, forKey: .fileId)
        fileSize = try c.decodeIfPresent(Int64.self, forKey: .fileSize) ?? 0
        fileName = try c.decode(String.self, forKey: .fileName)
        chatId = try c.decode(Int64.self, forKey: .chatId)
        chatTitle = try c.decode(String.self, forKey: .chatTitle)
        position = try c.decode(Double.self, forKey: .position)
        duration = try c.decode(Int.self, forKey: .duration)
        lastWatched = try c.decode(Double.self, forKey: .lastWatched)
        thumbnailFileId = try c.decodeIfPresent(Int.self, forKey: .thumbnailFileId)
    }
}
