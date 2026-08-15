import SwiftUI
import TDLibKit

struct ChatListView: View {
    @EnvironmentObject var client: TelegramClient
    @State private var chats: [Chat] = []
    @State private var isLoading = true
    @State private var showSettings = false
    @State private var searchText = ""

    var body: some View {
        NavigationView {
            ZStack {
                Color.black.edgesIgnoringSafeArea(.all)

                VStack(spacing: 0) {
                    // Search bar
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(Color(hex: "8B90A0"))
                            .font(.system(size: 16))
                        TextField("", text: $searchText, prompt: Text("Search chats...").foregroundColor(Color(hex: "8B90A0")))
                            .font(.system(size: 17))
                            .foregroundColor(Color(hex: "E3E2E7"))
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color(hex: "1E1F23"))
                    .cornerRadius(10)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)

                    if isLoading && chats.isEmpty {
                        Spacer()
                        ProgressView()
                            .tint(Color(hex: "ADC6FF"))
                        Spacer()
                    } else if filteredChats.isEmpty {
                        Spacer()
                        VStack(spacing: 8) {
                            Image(systemName: "bubble.left.and.bubble.right")
                                .font(.system(size: 32))
                                .foregroundColor(Color(hex: "8B90A0"))
                            Text("No chats found")
                                .font(.system(size: 15))
                                .foregroundColor(Color(hex: "8B90A0"))
                        }
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 0) {
                                ForEach(filteredChats, id: \.id) { chat in
                                    NavigationLink(destination: ChatDetailView(chatId: chat.id, title: chat.title)) {
                                        ChatRow(chat: chat)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("TeleStream")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 4) {
                        Button(action: { Task { await refreshChats() } }) {
                            Image(systemName: "arrow.clockwise")
                                .foregroundColor(Color(hex: "E3E2E7"))
                        }
                        Button(action: { showSettings = true }) {
                            Image(systemName: "gearshape")
                                .foregroundColor(Color(hex: "E3E2E7"))
                        }
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
        .preferredColorScheme(.dark)
    }

    private var filteredChats: [Chat] {
        if searchText.isEmpty { return chats }
        return chats.filter { $0.title.localizedCaseInsensitiveContains(searchText) }
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
}

struct ChatRow: View {
    let chat: Chat

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            ZStack(alignment: .bottomTrailing) {
                Circle()
                    .fill(Color(hex: "292A2E"))
                    .frame(width: 56, height: 56)
                    .overlay(
                        Image(systemName: chatIcon)
                            .font(.system(size: 22))
                            .foregroundColor(Color(hex: "ADC6FF"))
                    )

                // Type badge
                Image(systemName: typeBadgeIcon)
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "C8C6C8"))
                    .padding(4)
                    .background(Color(hex: "343539"))
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color.black, lineWidth: 1.5))
                    .offset(x: 2, y: 2)
            }

            // Text content
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(chat.title)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(Color(hex: "E3E2E7"))
                        .lineLimit(1)
                    Spacer()
                    if let msg = chat.lastMessage {
                        Text(formatDate(msg.date))
                            .font(.system(size: 13))
                            .foregroundColor(Color(hex: "8B90A0"))
                    }
                }

                if let msg = chat.lastMessage, let preview = messagePreview(msg) {
                    Text(preview)
                        .font(.system(size: 15))
                        .foregroundColor(Color(hex: "C1C6D7"))
                        .lineLimit(1)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.black)
    }

    private var chatIcon: String {
        switch chat.type {
        case .chatTypePrivate: return "person.fill"
        case .chatTypeBasicGroup: return "person.2.fill"
        case .chatTypeSupergroup(let info): return info.isChannel ? "megaphone.fill" : "person.3.fill"
        case .chatTypeSecret: return "lock.fill"
        }
    }

    private var typeBadgeIcon: String {
        switch chat.type {
        case .chatTypePrivate, .chatTypeSecret: return "person"
        case .chatTypeBasicGroup: return "person.2"
        case .chatTypeSupergroup(let info): return info.isChannel ? "megaphone" : "person.3"
        }
    }

    private func messagePreview(_ message: Message) -> String? {
        switch message.content {
        case .messageVideo(let v): return "Video: \(v.caption.text.isEmpty ? v.video.fileName : v.caption.text)"
        case .messageText(let t): return t.text.text
        case .messagePhoto: return "Photo"
        case .messageDocument(let d): return d.document.fileName
        default: return nil
        }
    }

    private func formatDate(_ timestamp: Int) -> String {
        let date = Date(timeIntervalSince1970: TimeInterval(timestamp))
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            let formatter = DateFormatter()
            formatter.dateFormat = "h:mm a"
            return formatter.string(from: date)
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "EEE"
            return formatter.string(from: date)
        }
    }
}
