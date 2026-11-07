import Foundation
import UIKit
import TDLibKit

@MainActor
final class TelegramClient: ObservableObject {
    static let shared = TelegramClient()

    let manager: TDLibClientManager
    private(set) var client: TDLibClient!

    @Published var authState: AuthorizationState?
    @Published var qrCodeUrl: String?
    @Published var authError: String?
    @Published var passwordHint: String?
    @Published var currentUserName: String = ""
    @Published var currentUserPhone: String = ""
    @Published var currentUserId: Int64 = 0
    @Published var isProcessingAuth: Bool = false

    let fileUpdateBroadcaster = FileUpdateBroadcaster()

    init() {
        manager = TDLibClientManager()
        client = manager.createClient(updateHandler: { [weak self] data, _ in
            self?.handleUpdate(data: data)
        })

        Task {
            await start()
        }
        Task { @MainActor in
            LocalStreamServer.shared.start(with: self)
        }
    }

    private func handleUpdate(data: Data) {
        do {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            let update = try decoder.decode(Update.self, from: data)
            Task { @MainActor in
                self.processUpdate(update)
            }
        } catch {
            // Unhandled update
        }
    }

    private func processUpdate(_ update: Update) {
        switch update {
        case .updateAuthorizationState(let state):
            self.authState = state.authorizationState
            handleAuthState(state.authorizationState)
        case .updateFile(let updateFile):
            fileUpdateBroadcaster.send(updateFile.file)
        default:
            break
        }
    }

    func start() async {
        do {
            let _ = try? await client.setLogVerbosityLevel(newVerbosityLevel: 1)
            let _ = try await client.getAuthorizationState()
        } catch {
            print("Failed to start TDLib: \(error)")
        }
    }

    private func handleAuthState(_ state: AuthorizationState) {
        Task {
            switch state {
            case .authorizationStateWaitTdlibParameters:
                let documents = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0]
                let _ = try? await client.setTdlibParameters(
                    apiHash: "9725211238ec77a8af28423d60cb9fa2",
                    apiId: 35445730,
                    applicationVersion: "1.0",
                    databaseDirectory: documents + "/tdlib",
                    databaseEncryptionKey: Data(),
                    deviceModel: "iOS",
                    filesDirectory: documents + "/tdlib_files",
                    systemLanguageCode: "en",
                    systemVersion: "iOS 17",
                    useChatInfoDatabase: true,
                    useFileDatabase: true,
                    useMessageDatabase: true,
                    useSecretChats: false,
                    useTestDc: false
                )
            case .authorizationStateWaitOtherDeviceConfirmation(let confirm):
                self.qrCodeUrl = confirm.link
                self.authError = nil
            case .authorizationStateWaitPassword(let pass):
                self.passwordHint = pass.passwordHint
                self.authError = nil
            case .authorizationStateWaitCode:
                self.authError = nil
            case .authorizationStateReady:
                self.qrCodeUrl = nil
                self.authError = nil
                self.passwordHint = nil
                Task { await self.fetchCurrentUser() }
            case .authorizationStateClosed:
                self.reinitClient()
            default:
                break
            }
        }
    }

    // MARK: - Auth Methods

    func resetToPhoneAuth() {
        qrCodeUrl = nil
        authError = nil
        reinitClient()
    }

    func startQRAuth() async {
        authError = nil
        if let _ = qrCodeUrl { return }
        do {
            let _ = try await client.requestQrCodeAuthentication(otherUserIds: [])
        } catch {
            if case .authorizationStateWaitOtherDeviceConfirmation = authState {
                return
            }
            authError = "QR login failed: \(error.localizedDescription)"
        }
    }

    func sendPhoneNumber(_ phone: String) async {
        authError = nil
        let digits = phone.filter { "0123456789".contains($0) }
        guard digits.count >= 6 else {
            authError = "Please enter a valid phone number with country code."
            return
        }
        let formatted = "+\(digits)"

        isProcessingAuth = true
        defer { isProcessingAuth = false }

        // If TDLib is waiting for QR confirmation, reset to wait for phone number
        if case .authorizationStateWaitOtherDeviceConfirmation = authState {
            qrCodeUrl = nil
            reinitClient()
            for _ in 0..<30 {
                if case .authorizationStateWaitPhoneNumber = authState {
                    break
                }
                try? await Task.sleep(nanoseconds: 100_000_000)
            }
        }

        do {
            let settings = PhoneNumberAuthenticationSettings(
                allowFlashCall: false,
                allowMissedCall: false,
                allowSmsRetrieverApi: false,
                authenticationTokens: [],
                firebaseAuthenticationSettings: nil,
                hasUnknownPhoneNumber: false,
                isCurrentPhoneNumber: false
            )
            let _ = try await client.setAuthenticationPhoneNumber(
                phoneNumber: formatted,
                settings: settings
            )
        } catch {
            let errStr = error.localizedDescription
            if errStr.contains("PHONE_NUMBER_INVALID") {
                authError = "Invalid phone number. Please check the country code and number."
            } else if errStr.contains("FLOOD_WAIT") {
                authError = "Too many attempts. Please try again later or use QR Code login."
            } else if errStr.contains("PHONE_NUMBER_BANNED") {
                authError = "This phone number is banned by Telegram."
            } else {
                authError = "Failed to send code: \(errStr)"
            }
        }
    }

    func sendAuthCode(_ code: String) async {
        authError = nil
        let cleaned = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return }

        isProcessingAuth = true
        defer { isProcessingAuth = false }

        do {
            let _ = try await client.checkAuthenticationCode(code: cleaned)
        } catch {
            let errStr = error.localizedDescription
            if errStr.contains("PHONE_CODE_INVALID") || errStr.contains("CODE_INVALID") {
                authError = "Incorrect verification code. Please check and try again."
            } else if errStr.contains("PHONE_CODE_EXPIRED") {
                authError = "Verification code has expired. Please request a new code."
            } else {
                authError = "Invalid code: \(errStr)"
            }
        }
    }

    func sendPassword(_ password: String) async {
        authError = nil
        guard !password.isEmpty else { return }

        isProcessingAuth = true
        defer { isProcessingAuth = false }

        do {
            let _ = try await client.checkAuthenticationPassword(password: password)
        } catch {
            authError = "Incorrect password: \(error.localizedDescription)"
        }
    }

    func registerUser(firstName: String, lastName: String) async {
        authError = nil
        guard !firstName.isEmpty else {
            authError = "First name is required."
            return
        }

        isProcessingAuth = true
        defer { isProcessingAuth = false }

        do {
            let _ = try await client.registerUser(disableNotification: false, firstName: firstName, lastName: lastName)
        } catch {
            authError = "Registration failed: \(error.localizedDescription)"
        }
    }

    func resendCode() async {
        authError = nil
        isProcessingAuth = true
        defer { isProcessingAuth = false }
        do {
            let _ = try await client.resendAuthenticationCode(reason: nil)
        } catch {
            let errStr = error.localizedDescription
            if errStr.contains("FLOOD_WAIT") {
                authError = "Please wait a few moments before requesting another code."
            } else if errStr.contains("AUTH_KEY_UNREGISTERED") {
                authError = "Session expired. Please re-enter your phone number."
            } else {
                authError = "Failed to resend code: \(errStr)"
            }
        }
    }

    // MARK: - File Updates (broadcast to multiple subscribers)

    func subscribeToFileUpdates() -> AsyncStream<TDLibKit.File> {
        fileUpdateBroadcaster.subscribe()
    }

    // MARK: - Chat & Video

    func getChats() async throws -> [Chat] {
        let chatList = try await client.getChats(chatList: .chatListMain, limit: 100)
        var chats = [Chat]()
        for chatId in chatList.chatIds {
            let chat = try await client.getChat(chatId: chatId)
            chats.append(chat)
        }
        return chats
    }

    private static let videoExtensions: Set<String> = ["mp4", "mkv", "avi", "ts", "mov", "m4v", "wmv", "flv", "webm", "3gp", "m3u8", "vob", "ogv"]

    func getVideos(in chatId: Int64) async throws -> [Message] {
        // Fetch actual video messages
        let videoResponse = try await client.searchChatMessages(
            chatId: chatId,
            filter: .searchMessagesFilterVideo,
            fromMessageId: 0,
            limit: 100,
            offset: 0,
            query: "",
            senderId: nil,
            topicId: nil
        )

        // Fetch document messages (which may contain video files)
        let docResponse = try await client.searchChatMessages(
            chatId: chatId,
            filter: .searchMessagesFilterDocument,
            fromMessageId: 0,
            limit: 100,
            offset: 0,
            query: "",
            senderId: nil,
            topicId: nil
        )

        // Filter documents that are actually video files
        let videoDocuments = docResponse.messages.filter { msg in
            guard case let .messageDocument(doc) = msg.content else { return false }
            let ext = (doc.document.fileName as NSString).pathExtension.lowercased()
            let mime = doc.document.mimeType.lowercased()
            return Self.videoExtensions.contains(ext) || mime.hasPrefix("video/") || mime.contains("matroska") || mime.contains("video")
        }

        // Combine and sort by date (newest first)
        var all = videoResponse.messages + videoDocuments
        all.sort { $0.date > $1.date }
        return all
    }

    // MARK: - User Info

    func fetchCurrentUser() async {
        do {
            let me = try await client.getMe()
            currentUserId = me.id
            currentUserName = [me.firstName, me.lastName].filter { !$0.isEmpty }.joined(separator: " ")
            currentUserPhone = me.phoneNumber.isEmpty ? "" : "+\(me.phoneNumber)"
        } catch {
            print("Failed to fetch user info: \(error)")
        }
    }

    func getSavedMessagesChat() async -> Chat? {
        if currentUserId == 0 {
            await fetchCurrentUser()
        }
        guard currentUserId != 0 else { return nil }

        // Try getting chat directly for current user id
        if let chat = try? await client.getChat(chatId: currentUserId) {
            return chat
        }
        // Or create/open private chat with oneself
        if let chat = try? await client.createPrivateChat(force: false, userId: currentUserId) {
            return chat
        }
        return nil
    }

    // MARK: - Avatar/Photo

    func downloadPhoto(fileId: Int) async -> String? {
        do {
            let file = try await client.downloadFile(
                fileId: fileId,
                limit: 0,
                offset: 0,
                priority: 1,
                synchronous: true
            )
            if file.local.isDownloadingCompleted {
                return file.local.path
            }
        } catch {
            // Silently fail for avatar downloads
        }
        return nil
    }

    // MARK: - Video / Document Thumbnail Cache

    private var thumbnailCache = NSCache<NSNumber, UIImage>()

    func getThumbnail(file: TDLibKit.File?) async -> UIImage? {
        guard let file = file else { return nil }
        return await getThumbnail(fileId: file.id)
    }

    func getThumbnail(fileId: Int?) async -> UIImage? {
        guard let fileId = fileId, fileId > 0 else { return nil }
        let key = NSNumber(value: fileId)
        if let cached = thumbnailCache.object(forKey: key) {
            return cached
        }
        if let file = try? await client.getFile(fileId: fileId),
           file.local.isDownloadingCompleted && !file.local.path.isEmpty {
            if let img = UIImage(contentsOfFile: file.local.path) {
                thumbnailCache.setObject(img, forKey: key)
                return img
            }
        }
        do {
            let downloaded = try await client.downloadFile(
                fileId: fileId,
                limit: 0,
                offset: 0,
                priority: 1,
                synchronous: true
            )
            if downloaded.local.isDownloadingCompleted && !downloaded.local.path.isEmpty {
                if let img = UIImage(contentsOfFile: downloaded.local.path) {
                    thumbnailCache.setObject(img, forKey: key)
                    return img
                }
            }
        } catch {
            do {
                _ = try await client.downloadFile(
                    fileId: fileId,
                    limit: 0,
                    offset: 0,
                    priority: 1,
                    synchronous: false
                )
            } catch {}
        }
        return nil
    }

    // MARK: - Persistent media resolution
    //
    // TDLib file ids are only valid inside the current TDLib session. History entries
    // saved before a force-close therefore point at the wrong file (or nothing), which
    // made the player hang until history was cleared. These helpers re-locate a video
    // from its chat message / persistent remote id and return fresh ids.

    nonisolated static func media(from message: Message) -> PlayableMedia? {
        switch message.content {
        case .messageVideo(let vc):
            let v = vc.video
            return PlayableMedia(
                fileId: v.video.id,
                fileSize: v.video.size > 0 ? v.video.size : v.video.expectedSize,
                fileName: v.fileName.isEmpty ? "Video.mp4" : v.fileName,
                chatId: message.chatId,
                messageId: message.id,
                duration: v.duration,
                uniqueId: v.video.remote.uniqueId,
                remoteId: v.video.remote.id,
                thumbnailFileId: v.thumbnail?.file.id,
                thumbnailRemoteId: v.thumbnail?.file.remote.id ?? ""
            )
        case .messageDocument(let dc):
            let d = dc.document
            return PlayableMedia(
                fileId: d.document.id,
                fileSize: d.document.size > 0 ? d.document.size : d.document.expectedSize,
                fileName: d.fileName.isEmpty ? "Video" : d.fileName,
                chatId: message.chatId,
                messageId: message.id,
                duration: 0,
                uniqueId: d.document.remote.uniqueId,
                remoteId: d.document.remote.id,
                thumbnailFileId: d.thumbnail?.file.id,
                thumbnailRemoteId: d.thumbnail?.file.remote.id ?? ""
            )
        default:
            return nil
        }
    }

    /// Returns `media` with up-to-date, session-valid file ids, or nil if the video
    /// can no longer be found.
    func resolveMedia(_ media: PlayableMedia) async -> PlayableMedia? {
        // 1. Best: reload the original message (also refreshes expired file references).
        if media.chatId != 0 && media.messageId != 0,
           let message = try? await client.getMessage(chatId: media.chatId, messageId: media.messageId),
           var fresh = Self.media(from: message) {
            if fresh.duration <= 0 { fresh.duration = media.duration }
            return fresh
        }

        // 2. The fileId is still valid if it's the same physical file.
        if media.fileId > 0, let file = try? await client.getFile(fileId: media.fileId), isSameFile(file, as: media) {
            var fresh = media
            fresh.uniqueId = file.remote.uniqueId
            fresh.remoteId = file.remote.id
            if fresh.fileSize <= 0 { fresh.fileSize = file.size > 0 ? file.size : file.expectedSize }
            if !media.uniqueId.isEmpty || media.chatId == 0 || media.messageId != 0 {
                return await withFreshThumbnail(fresh)
            }
            // Legacy entry (no persistent ids): prefer locating the message so we can store its id.
            if let found = await findMediaInChat(media) { return found }
            return await withFreshThumbnail(fresh)
        }

        // 3. Persistent remote id.
        if !media.remoteId.isEmpty, let file = try? await client.getRemoteFile(fileType: nil, remoteFileId: media.remoteId) {
            var fresh = media
            fresh.fileId = file.id
            fresh.uniqueId = file.remote.uniqueId
            if fresh.fileSize <= 0 { fresh.fileSize = file.size > 0 ? file.size : file.expectedSize }
            if let found = await findMediaInChat(fresh) { return found }
            return await withFreshThumbnail(fresh)
        }

        // 4. Last resort: search the chat by file name / size.
        return await findMediaInChat(media)
    }

    private func isSameFile(_ file: TDLibKit.File, as media: PlayableMedia) -> Bool {
        if !media.uniqueId.isEmpty {
            return file.remote.uniqueId == media.uniqueId
        }
        let size = file.size > 0 ? file.size : file.expectedSize
        return media.fileSize > 0 && size == media.fileSize
    }

    private func withFreshThumbnail(_ media: PlayableMedia) async -> PlayableMedia {
        var m = media
        if !m.thumbnailRemoteId.isEmpty,
           let thumb = try? await client.getRemoteFile(fileType: nil, remoteFileId: m.thumbnailRemoteId) {
            m.thumbnailFileId = thumb.id
        } else if m.thumbnailRemoteId.isEmpty {
            m.thumbnailFileId = nil // stale session id; would show the wrong picture
        }
        return m
    }

    private func findMediaInChat(_ media: PlayableMedia) async -> PlayableMedia? {
        guard media.chatId != 0 else { return nil }

        func matches(_ m: PlayableMedia) -> Bool {
            if !media.uniqueId.isEmpty { return m.uniqueId == media.uniqueId }
            guard m.fileName == media.fileName else { return false }
            return media.fileSize <= 0 || m.fileSize == media.fileSize
        }

        // Targeted search by file name first (cheap and works for older messages).
        let baseName = (media.fileName as NSString).deletingPathExtension
        if !baseName.isEmpty {
            for filter in [SearchMessagesFilter.searchMessagesFilterDocument, .searchMessagesFilterVideo] {
                if let res = try? await client.searchChatMessages(
                    chatId: media.chatId,
                    filter: filter,
                    fromMessageId: 0,
                    limit: 50,
                    offset: 0,
                    query: baseName,
                    senderId: nil,
                    topicId: nil
                ) {
                    for msg in res.messages {
                        if var m = Self.media(from: msg), matches(m) {
                            if m.duration <= 0 { m.duration = media.duration }
                            return m
                        }
                    }
                }
            }
        }

        // Fall back to the recent videos list.
        if let messages = try? await getVideos(in: media.chatId) {
            for msg in messages {
                if var m = Self.media(from: msg), matches(m) {
                    if m.duration <= 0 { m.duration = media.duration }
                    return m
                }
            }
        }
        return nil
    }

    /// Upgrades history entries written by older app versions (session-scoped ids only).
    func repairLegacyHistory() async {
        let legacy = AppSettings.shared.continueWatching.filter { $0.isLegacy }
        for item in legacy {
            guard let found = await findMediaInChat(item.media) else { continue }
            AppSettings.shared.upgradeHistoryItem(oldKey: item.key, with: found)
        }
    }

    /// Resolve a thumbnail, preferring the persistent remote id.
    func getThumbnail(remoteId: String, fallbackFileId: Int?) async -> UIImage? {
        if !remoteId.isEmpty,
           let file = try? await client.getRemoteFile(fileType: nil, remoteFileId: remoteId) {
            return await getThumbnail(fileId: file.id)
        }
        return await getThumbnail(fileId: fallbackFileId)
    }

    /// Delete the local copies of videos that fell out of the "max cached videos" window.
    func evictCachedFiles(_ files: [CachedStreamFile]) async {
        for entry in files {
            guard let file = try? await client.getRemoteFile(fileType: nil, remoteFileId: entry.remoteId) else { continue }
            guard file.remote.uniqueId == entry.uniqueId else { continue }
            if file.local.downloadedSize > 0 || file.local.isDownloadingActive {
                _ = try? await client.cancelDownloadFile(fileId: file.id, onlyIfPending: false)
                _ = try? await client.deleteFile(fileId: file.id)
            }
        }
    }

    // MARK: - Cache Management

    static let maxCachedVideos = 3

    func getCacheSize() async -> Int64 {
        let documents = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0]
        let tdlibFiles = documents + "/tdlib_files"
        return Self.directorySize(at: tdlibFiles)
    }

    func clearCache() async {
        // Let TDLib delete the files so its file database stays consistent. Deleting
        // files behind TDLib's back left it reporting downloaded parts that no longer
        // existed, so the stream server read empty data and playback stalled.
        _ = try? await client.optimizeStorage(
            chatIds: nil,
            chatLimit: 0,
            count: 0,
            excludeChatIds: nil,
            fileTypes: nil,
            immunityDelay: 0,
            returnDeletedFileStatistics: false,
            size: 0,
            ttl: 0
        )
        AppSettings.shared.recentStreamedFiles = []
        thumbnailCache.removeAllObjects()
    }

    private static func directorySize(at path: String) -> Int64 {
        let fm = FileManager.default
        let url = URL(fileURLWithPath: path)
        guard let enumerator = fm.enumerator(
            at: url,
            includingPropertiesForKeys: [.isRegularFileKey, .totalFileAllocatedSizeKey, .fileAllocatedSizeKey, .fileSizeKey],
            options: [.skipsHiddenFiles]
        ) else { return 0 }
        
        var total: Int64 = 0
        for case let fileURL as URL in enumerator {
            guard let values = try? fileURL.resourceValues(forKeys: [.isRegularFileKey, .totalFileAllocatedSizeKey, .fileAllocatedSizeKey, .fileSizeKey]),
                  values.isRegularFile == true else { continue }
            let allocated = Int64(values.totalFileAllocatedSize ?? values.fileAllocatedSize ?? values.fileSize ?? 0)
            total += allocated
        }
        return total
    }

    // MARK: - Logout

    func logout() async {
        do {
            let _ = try await client.logOut()
        } catch {
            print("Logout error: \(error)")
        }
        reinitClient()
    }

    func reinitClient() {
        self.authState = nil
        self.qrCodeUrl = nil
        self.authError = nil
        self.passwordHint = nil
        self.currentUserName = ""
        self.currentUserPhone = ""
        self.isProcessingAuth = false

        client = manager.createClient(updateHandler: { [weak self] data, _ in
            self?.handleUpdate(data: data)
        })

        Task {
            await start()
        }
        Task { @MainActor in
            LocalStreamServer.shared.start(with: self)
        }
    }
}

// MARK: - File Update Broadcaster (supports multiple subscribers)

final class FileUpdateBroadcaster: @unchecked Sendable {
    private var continuations: [UUID: AsyncStream<TDLibKit.File>.Continuation] = [:]
    private let lock = NSLock()

    func subscribe() -> AsyncStream<TDLibKit.File> {
        let id = UUID()
        return AsyncStream { [weak self] continuation in
            guard let self else { return }
            self.lock.lock()
            self.continuations[id] = continuation
            self.lock.unlock()

            continuation.onTermination = { @Sendable [weak self] _ in
                guard let self else { return }
                self.lock.lock()
                self.continuations.removeValue(forKey: id)
                self.lock.unlock()
            }
        }
    }

    func send(_ file: TDLibKit.File) {
        lock.lock()
        let snapshot = Array(continuations.values)
        lock.unlock()
        for continuation in snapshot {
            continuation.yield(file)
        }
    }
}
