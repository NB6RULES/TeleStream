import Foundation
import TDLibKit

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
    @Published var chatViewLayout: String {
        didSet { UserDefaults.standard.set(chatViewLayout, forKey: "chatViewLayout") }
    }
    @Published var videoViewLayout: String {
        didSet { UserDefaults.standard.set(videoViewLayout, forKey: "videoViewLayout") }
    }
    @Published var favoriteChatIds: Set<Int64> {
        didSet {
            let array = Array(favoriteChatIds)
            UserDefaults.standard.set(array, forKey: "favoriteChatIds")
        }
    }

    // Continue watching positions keyed by a *persistent* media key.
    // TDLib file ids are only valid for the current TDLib session, so after the app
    // is force-closed they point at a different (or no) file. We key everything by
    // the file's remote unique id, which never changes.
    @Published var playbackPositions: [String: Double] {
        didSet {
            if let data = try? JSONEncoder().encode(playbackPositions) {
                UserDefaults.standard.set(data, forKey: "playbackPositionsV2")
            }
        }
    }

    // Continue watching metadata (most recent first)
    @Published var continueWatching: [ContinueWatchingItem] {
        didSet {
            if let data = try? JSONEncoder().encode(continueWatching) {
                UserDefaults.standard.set(data, forKey: "continueWatching")
            }
        }
    }

    // Recently streamed files (persistent remote ids), newest first. Used to evict
    // old downloaded videos so the cache honours `maxCachedVideos`.
    @Published var recentStreamedFiles: [CachedStreamFile] {
        didSet {
            if let data = try? JSONEncoder().encode(recentStreamedFiles) {
                UserDefaults.standard.set(data, forKey: "recentStreamedFiles")
            }
        }
    }

    init() {
        let defaults = UserDefaults.standard
        self.maxCachedVideos = defaults.object(forKey: "maxCachedVideos") as? Int ?? 3
        self.downloadWholeFirst = defaults.bool(forKey: "downloadWholeFirst")
        self.autoNextEpisode = defaults.object(forKey: "autoNextEpisode") as? Bool ?? true
        self.hideClipsBelowMB = defaults.object(forKey: "hideClipsBelowMB") as? Int ?? 0
        self.chatViewLayout = defaults.string(forKey: "chatViewLayout") ?? "rows"
        self.videoViewLayout = defaults.string(forKey: "videoViewLayout") ?? "rows"

        if let favArray = defaults.array(forKey: "favoriteChatIds") as? [Int64] {
            self.favoriteChatIds = Set(favArray)
        } else if let favInts = defaults.array(forKey: "favoriteChatIds") as? [Int] {
            self.favoriteChatIds = Set(favInts.map { Int64($0) })
        } else {
            self.favoriteChatIds = []
        }

        var items: [ContinueWatchingItem] = []
        if let data = defaults.data(forKey: "continueWatching"),
           let decoded = try? JSONDecoder().decode([ContinueWatchingItem].self, from: data) {
            items = decoded
        }

        var positions: [String: Double] = [:]
        if let data = defaults.data(forKey: "playbackPositionsV2"),
           let decoded = try? JSONDecoder().decode([String: Double].self, from: data) {
            positions = decoded
        } else {
            // Migrate from the old fileId-keyed store: only the positions stored inside
            // history items are trustworthy (old fileIds are stale after a restart).
            for item in items where positions[item.key] == nil {
                positions[item.key] = item.position
            }
            defaults.removeObject(forKey: "playbackPositions")
        }

        if let data = defaults.data(forKey: "recentStreamedFiles"),
           let decoded = try? JSONDecoder().decode([CachedStreamFile].self, from: data) {
            self.recentStreamedFiles = decoded
        } else {
            self.recentStreamedFiles = []
        }

        self.continueWatching = items
        self.playbackPositions = positions
    }

    // MARK: - Media keys

    nonisolated static func mediaKey(uniqueId: String, fileId: Int) -> String {
        uniqueId.isEmpty ? "id:\(fileId)" : uniqueId
    }

    nonisolated static func mediaKey(for file: TDLibKit.File) -> String {
        mediaKey(uniqueId: file.remote.uniqueId, fileId: file.id)
    }

    func position(forKey key: String) -> Double? {
        playbackPositions[key]
    }

    func position(for file: TDLibKit.File) -> Double? {
        playbackPositions[Self.mediaKey(for: file)]
    }

    /// Watch progress 0...1 for a file, using the known duration or the one stored in history.
    func progress(for file: TDLibKit.File, duration: Int) -> Double? {
        let key = Self.mediaKey(for: file)
        guard let pos = playbackPositions[key] else { return nil }
        var dur = duration
        if dur <= 0 {
            dur = continueWatching.first(where: { $0.key == key })?.duration ?? 0
        }
        guard dur > 0 else { return nil }
        return min(max(pos / Double(dur), 0), 1)
    }

    func savePosition(_ media: PlayableMedia, position: Double, chatTitle: String, duration: Int) {
        let key = media.key
        playbackPositions[key] = position

        let existing = continueWatching.first(where: { $0.key == key })
        continueWatching.removeAll { $0.key == key }

        let item = ContinueWatchingItem(
            fileId: media.fileId,
            fileSize: media.fileSize,
            fileName: media.fileName,
            chatId: media.chatId,
            chatTitle: chatTitle.isEmpty ? (existing?.chatTitle ?? "") : chatTitle,
            position: position,
            duration: duration > 0 ? duration : (existing?.duration ?? 0),
            lastWatched: Date().timeIntervalSince1970,
            thumbnailFileId: media.thumbnailFileId ?? existing?.thumbnailFileId,
            uniqueId: media.uniqueId,
            remoteId: media.remoteId.isEmpty ? (existing?.remoteId ?? "") : media.remoteId,
            messageId: media.messageId != 0 ? media.messageId : (existing?.messageId ?? 0),
            thumbnailRemoteId: media.thumbnailRemoteId.isEmpty ? (existing?.thumbnailRemoteId ?? "") : media.thumbnailRemoteId
        )
        continueWatching.insert(item, at: 0)
        if continueWatching.count > 100 {
            continueWatching = Array(continueWatching.prefix(100))
        }
    }

    /// Replace a legacy (fileId-only) history entry with a resolved, persistent one.
    func upgradeHistoryItem(oldKey: String, with media: PlayableMedia) {
        guard let idx = continueWatching.firstIndex(where: { $0.key == oldKey }) else { return }
        let old = continueWatching[idx]
        let newKey = media.key
        if newKey == oldKey { return }
        let pos = playbackPositions[oldKey] ?? old.position
        playbackPositions.removeValue(forKey: oldKey)
        if playbackPositions[newKey] == nil {
            playbackPositions[newKey] = pos
        }
        if continueWatching.contains(where: { $0.key == newKey }) {
            // Already have a modern entry for this video; drop the stale duplicate.
            continueWatching.remove(at: idx)
            return
        }
        continueWatching[idx] = ContinueWatchingItem(
            fileId: media.fileId,
            fileSize: media.fileSize > 0 ? media.fileSize : old.fileSize,
            fileName: old.fileName,
            chatId: old.chatId,
            chatTitle: old.chatTitle,
            position: pos,
            duration: old.duration,
            lastWatched: old.lastWatched,
            thumbnailFileId: media.thumbnailFileId,
            uniqueId: media.uniqueId,
            remoteId: media.remoteId,
            messageId: media.messageId,
            thumbnailRemoteId: media.thumbnailRemoteId
        )
    }

    func clearPosition(key: String) {
        playbackPositions.removeValue(forKey: key)
        continueWatching.removeAll { $0.key == key }
    }

    func clearAllPositions() {
        playbackPositions = [:]
        continueWatching = []
    }

    /// Records a streamed file and returns the entries that fell out of the cache window.
    func noteStreamed(uniqueId: String, remoteId: String) -> [CachedStreamFile] {
        guard !uniqueId.isEmpty, !remoteId.isEmpty else { return [] }
        var list = recentStreamedFiles.filter { $0.uniqueId != uniqueId }
        list.insert(CachedStreamFile(uniqueId: uniqueId, remoteId: remoteId), at: 0)
        let limit = max(1, maxCachedVideos)
        var evicted: [CachedStreamFile] = []
        if list.count > limit {
            evicted = Array(list[limit...])
            list = Array(list.prefix(limit))
        }
        recentStreamedFiles = list
        return evicted
    }

    func toggleFavorite(chatId: Int64) {
        if favoriteChatIds.contains(chatId) {
            favoriteChatIds.remove(chatId)
        } else {
            favoriteChatIds.insert(chatId)
        }
    }

    func isFavorite(chatId: Int64) -> Bool {
        favoriteChatIds.contains(chatId)
    }
}

struct CachedStreamFile: Codable, Equatable {
    let uniqueId: String
    let remoteId: String
}

/// Everything needed to (re)locate and play a Telegram video, including the
/// persistent identifiers that survive app restarts.
struct PlayableMedia: Equatable {
    var fileId: Int
    var fileSize: Int64
    var fileName: String
    var chatId: Int64 = 0
    var messageId: Int64 = 0
    var duration: Int = 0
    var uniqueId: String = ""
    var remoteId: String = ""
    var thumbnailFileId: Int? = nil
    var thumbnailRemoteId: String = ""

    var key: String { AppSettings.mediaKey(uniqueId: uniqueId, fileId: fileId) }

    var isNonNativeContainer: Bool {
        let ext = (fileName as NSString).pathExtension.lowercased()
        return ["mkv", "avi", "webm", "flv", "wmv", "ts", "vob", "ogv", "3gp", "rmvb", "rm", "mpg", "mpeg", "m2ts", "mts"].contains(ext)
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
    var uniqueId: String
    var remoteId: String
    var messageId: Int64
    var thumbnailRemoteId: String

    var key: String { AppSettings.mediaKey(uniqueId: uniqueId, fileId: fileId) }
    var id: String { key }

    /// Entries saved by older versions only stored session-scoped TDLib ids.
    var isLegacy: Bool { uniqueId.isEmpty }

    var progress: Double {
        guard duration > 0 else { return 0 }
        return min(max(position / Double(duration), 0), 1)
    }

    var media: PlayableMedia {
        PlayableMedia(
            fileId: fileId,
            fileSize: fileSize,
            fileName: fileName,
            chatId: chatId,
            messageId: messageId,
            duration: duration,
            uniqueId: uniqueId,
            remoteId: remoteId,
            thumbnailFileId: thumbnailFileId,
            thumbnailRemoteId: thumbnailRemoteId
        )
    }

    enum CodingKeys: String, CodingKey {
        case fileId, fileSize, fileName, chatId, chatTitle, position, duration, lastWatched, thumbnailFileId
        case uniqueId, remoteId, messageId, thumbnailRemoteId
    }

    init(fileId: Int, fileSize: Int64 = 0, fileName: String, chatId: Int64, chatTitle: String, position: Double, duration: Int, lastWatched: Double, thumbnailFileId: Int? = nil, uniqueId: String = "", remoteId: String = "", messageId: Int64 = 0, thumbnailRemoteId: String = "") {
        self.fileId = fileId
        self.fileSize = fileSize
        self.fileName = fileName
        self.chatId = chatId
        self.chatTitle = chatTitle
        self.position = position
        self.duration = duration
        self.lastWatched = lastWatched
        self.thumbnailFileId = thumbnailFileId
        self.uniqueId = uniqueId
        self.remoteId = remoteId
        self.messageId = messageId
        self.thumbnailRemoteId = thumbnailRemoteId
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
        uniqueId = try c.decodeIfPresent(String.self, forKey: .uniqueId) ?? ""
        remoteId = try c.decodeIfPresent(String.self, forKey: .remoteId) ?? ""
        messageId = try c.decodeIfPresent(Int64.self, forKey: .messageId) ?? 0
        thumbnailRemoteId = try c.decodeIfPresent(String.self, forKey: .thumbnailRemoteId) ?? ""
    }
}
