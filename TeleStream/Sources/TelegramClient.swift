import Foundation
import TDLibKit

@MainActor
final class TelegramClient: ObservableObject {
    static let shared = TelegramClient()

    let manager: TDLibClientManager
    private(set) var client: TDLibClient!

    @Published var authState: AuthorizationState?
    @Published var qrCodeUrl: String?
    @Published var authError: String?
    @Published var currentUserName: String = ""
    @Published var currentUserPhone: String = ""

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
            case .authorizationStateReady:
                self.qrCodeUrl = nil
                self.authError = nil
                Task { await self.fetchCurrentUser() }
            default:
                break
            }
        }
    }

    // MARK: - Auth Methods

    func startQRAuth() async {
        authError = nil
        do {
            let _ = try await client.requestQrCodeAuthentication(otherUserIds: [])
        } catch {
            authError = "QR login failed: \(error.localizedDescription)"
        }
    }

    func sendPhoneNumber(_ phone: String) async {
        authError = nil
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
                phoneNumber: phone,
                settings: settings
            )
        } catch {
            authError = "Failed to send code: \(error.localizedDescription)"
        }
    }

    func sendAuthCode(_ code: String) async {
        authError = nil
        do {
            let _ = try await client.checkAuthenticationCode(code: code)
        } catch {
            authError = "Invalid code: \(error.localizedDescription)"
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

    func getVideos(in chatId: Int64) async throws -> [Message] {
        let response = try await client.searchChatMessages(
            chatId: chatId,
            filter: .searchMessagesFilterVideo,
            fromMessageId: 0,
            limit: 50,
            offset: 0,
            query: "",
            senderId: nil,
            topicId: nil
        )
        return response.messages
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

    func getChatPhoto(chatId: Int64) async -> String? {
        do {
            let chat = try await client.getChat(chatId: chatId)
            guard let photo = chat.photo else { return nil }
            let smallFile = photo.small
            if smallFile.local.isDownloadingCompleted {
                return smallFile.local.path
            }
            return await downloadPhoto(fileId: smallFile.id)
        } catch {
            return nil
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
        let _ = try? await client.logOut()
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
