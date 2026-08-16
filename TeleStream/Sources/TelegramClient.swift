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
        let cleaned = phone.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "-", with: "")
            .replacingOccurrences(of: "(", with: "")
            .replacingOccurrences(of: ")", with: "")
        let formatted = cleaned.hasPrefix("+") ? cleaned : "+\(cleaned)"

        guard formatted.count >= 6 else {
            authError = "Please enter a valid phone number with country code (e.g. +1234567890)."
            return
        }

        isProcessingAuth = true
        defer { isProcessingAuth = false }

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
            authError = "Failed to send code: \(error.localizedDescription)"
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
            authError = "Invalid code: \(error.localizedDescription)"
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
        do {
            let _ = try await client.resendAuthenticationCode(reason: nil)
        } catch {
            authError = "Failed to resend code: \(error.localizedDescription)"
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
            currentUserName = [me.firstName, me.lastName].filter { !$0.isEmpty }.joined(separator: " ")
            currentUserPhone = me.phoneNumber.isEmpty ? "" : "+\(me.phoneNumber)"
        } catch {
            print("Failed to fetch user info: \(error)")
        }
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
            // ignore thumbnail download error
        }
        return nil
    }

    // MARK: - Cache Management

    static let maxCachedVideos = 3

    func getCacheSize() async -> Int64 {
        let documents = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0]
        let tdlibFiles = documents + "/tdlib_files"
        return Self.directorySize(at: tdlibFiles)
    }

    func clearCache() async {
        let documents = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0]
        let tdlibFiles = documents + "/tdlib_files"
        let fm = FileManager.default
        if let contents = try? fm.contentsOfDirectory(atPath: tdlibFiles) {
            for item in contents {
                let path = (tdlibFiles as NSString).appendingPathComponent(item)
                try? fm.removeItem(atPath: path)
            }
        }
    }

    private static func directorySize(at path: String) -> Int64 {
        let fm = FileManager.default
        guard let enumerator = fm.enumerator(atPath: path) else { return 0 }
        var total: Int64 = 0
        while let file = enumerator.nextObject() as? String {
            let full = (path as NSString).appendingPathComponent(file)
            if let attrs = try? fm.attributesOfItem(atPath: full),
               let size = attrs[.size] as? Int64 {
                total += size
            }
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
