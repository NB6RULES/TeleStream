import SwiftUI
import TDLibKit

struct ChatListView: View {
    @EnvironmentObject var client: TelegramClient
    @State private var chats: [Chat] = []
    @State private var isLoading = true
    @State private var showSettings = false

    var body: some View {
        NavigationView {
            Group {
                if isLoading && chats.isEmpty {
                    ProgressView("Loading chats...")
                } else if chats.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "bubble.left.and.bubble.right")
                            .font(.largeTitle)
                            .foregroundColor(.secondary)
                        Text("No chats found")
                            .foregroundColor(.secondary)
                    }
                } else {
                    List(chats, id: \.id) { chat in
                        NavigationLink(destination: ChatDetailView(chatId: chat.id, title: chat.title)) {
                            HStack(spacing: 12) {
                                Image(systemName: chatIcon(for: chat))
                                    .foregroundColor(.blue)
                                    .frame(width: 32, height: 32)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(chat.title)
                                        .font(.body)
                                    if let lastMessage = chat.lastMessage,
                                       let text = messagePreview(lastMessage) {
                                        Text(text)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                            .lineLimit(1)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("TeleStream")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { showSettings = true }) {
                        Image(systemName: "gear")
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { Task { await refreshChats() } }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
            .task {
                await refreshChats()
            }
        }
    }

    private func refreshChats() async {
        isLoading = true
        do {
            chats = try await client.getChats()
        } catch {
            print("Error fetching chats: \(error)")
        }
        isLoading = false
    }

    private func chatIcon(for chat: Chat) -> String {
        switch chat.type {
        case .chatTypePrivate:
            return "person.fill"
        case .chatTypeBasicGroup:
            return "person.2.fill"
        case .chatTypeSupergroup(let info):
            return info.isChannel ? "megaphone.fill" : "person.3.fill"
        case .chatTypeSecret:
            return "lock.fill"
        }
    }

    private func messagePreview(_ message: Message) -> String? {
        switch message.content {
        case .messageVideo(let video):
            return "📹 \(video.caption.text.isEmpty ? "Video" : video.caption.text)"
        case .messageText(let text):
            return text.text.text
        case .messagePhoto:
            return "📷 Photo"
        case .messageDocument(let doc):
            return "📎 \(doc.document.fileName)"
        default:
            return nil
        }
    }
}
