import SwiftUI
import UIKit
import TDLibKit

enum ChatFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case unread = "Unread"
    case favourites = "Favourites"
    case groups = "Groups"
    case channels = "Channels"

    var id: String { rawValue }
}

struct ChatListView: View {
    @EnvironmentObject var client: TelegramClient
    @ObservedObject var settings = AppSettings.shared
    @State private var chats: [Chat] = []
    @State private var isLoading = true
    @State private var searchText = ""
    @State private var selectedFilter: ChatFilter = .all
    @State private var navigationRootId = UUID()

    var body: some View {
        NavigationView {
            ZStack {
                Color.black.edgesIgnoringSafeArea(.all)

                VStack(spacing: 0) {
                    // Search bar (WhatsApp style)
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(Color(hex: "8B90A0"))
                            .font(.system(size: 16))
                        TextField("", text: $searchText, prompt: Text("Ask AI or Search chats...").foregroundColor(Color(hex: "8B90A0")))
                            .font(.system(size: 16))
                            .foregroundColor(Color(hex: "E3E2E7"))
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(Color(hex: "8B90A0"))
                            }
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color(hex: "1E1F23"))
                    .cornerRadius(12)
                    .padding(.horizontal, 16)
                    .padding(.top, 10)
                    .padding(.bottom, 8)

                    // WhatsApp-style Filter Pills
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(ChatFilter.allCases) { filter in
                                FilterPillButton(
                                    title: filter.rawValue,
                                    count: countForFilter(filter),
                                    isSelected: selectedFilter == filter,
                                    action: {
                                        withAnimation(.easeInOut(duration: 0.2)) {
                                            selectedFilter = filter
                                        }
                                    }
                                )
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 6)
                    }

                    // Saved Messages shortcut bar (like WhatsApp Archived)
                    if searchText.isEmpty && selectedFilter == .all {
                        NavigationLink(destination: ChatDetailView(chatId: client.currentUserId, title: "Saved Messages")) {
                            HStack(spacing: 14) {
                                ZStack {
                                    Circle()
                                        .fill(Color(hex: "007AFF").opacity(0.18))
                                        .frame(width: 40, height: 40)
                                    Image(systemName: "bookmark.fill")
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(Color(hex: "007AFF"))
                                }

                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Saved Messages")
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(Color(hex: "E3E2E7"))
                                    Text("Personal cloud & video bookmarks")
                                        .font(.system(size: 13))
                                        .foregroundColor(Color(hex: "8B90A0"))
                                }

                                Spacer()

                                Image(systemName: "chevron.right")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(Color(hex: "8B90A0"))
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(Color(hex: "1E1F23").opacity(0.7))
                            .cornerRadius(12)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 6)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }

                    // Main Content
                    if isLoading && chats.isEmpty {
                        Spacer()
                        ProgressView()
                            .tint(Color(hex: "ADC6FF"))
                        Spacer()
                    } else if filteredChats.isEmpty {
                        Spacer()
                        if selectedFilter == .favourites && searchText.isEmpty {
                            VStack(spacing: 16) {
                                ZStack {
                                    Circle()
                                        .fill(Color.yellow.opacity(0.15))
                                        .frame(width: 76, height: 76)
                                    Image(systemName: "star.fill")
                                        .font(.system(size: 34))
                                        .foregroundColor(.yellow)
                                }

                                VStack(spacing: 8) {
                                    Text("No Favourites Yet")
                                        .font(.system(size: 18, weight: .bold))
                                        .foregroundColor(Color(hex: "E3E2E7"))

                                    Text("Swipe right on any chat in the list or press and hold a chat to select 'Add to Favourites'.")
                                        .font(.system(size: 14))
                                        .foregroundColor(Color(hex: "8B90A0"))
                                        .multilineTextAlignment(.center)
                                        .padding(.horizontal, 32)
                                }

                                Button(action: {
                                    withAnimation(.easeInOut(duration: 0.2)) {
                                        selectedFilter = .all
                                    }
                                }) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "bubble.left.and.bubble.right.fill")
                                        Text("Browse All Chats")
                                    }
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 20)
                                    .padding(.vertical, 10)
                                    .background(Color(hex: "007AFF"))
                                    .clipShape(Capsule())
                                }
                                .padding(.top, 4)
                            }
                            .padding(.horizontal, 24)
                        } else {
                            VStack(spacing: 12) {
                                Image(systemName: emptyStateIcon)
                                    .font(.system(size: 38))
                                    .foregroundColor(Color(hex: "8B90A0"))
                                Text(emptyStateText)
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(Color(hex: "8B90A0"))
                            }
                        }
                        Spacer()
                    } else {
                        List {
                            if searchText.isEmpty && selectedFilter == .all {
                                ContinueWatchingRow()
                                    .listRowInsets(EdgeInsets())
                                    .listRowBackground(Color.clear)
                                    .listRowSeparator(.hidden)
                                    .padding(.bottom, 8)
                            }

                            ForEach(filteredChats, id: \.id) { chat in
                                ZStack {
                                    NavigationLink(destination: ChatDetailView(chatId: chat.id, title: chat.title)) {
                                        EmptyView()
                                    }
                                    .opacity(0)

                                    ChatRow(chat: chat)
                                }
                                .listRowInsets(EdgeInsets())
                                .listRowBackground(Color.clear)
                                .listRowSeparator(.hidden)
                                .swipeActions(edge: .leading, allowsFullSwipe: true) {
                                    Button {
                                        settings.toggleFavorite(chatId: chat.id)
                                    } label: {
                                        Label(
                                            settings.isFavorite(chatId: chat.id) ? "Unfavourite" : "Favourite",
                                            systemImage: settings.isFavorite(chatId: chat.id) ? "star.slash.fill" : "star.fill"
                                        )
                                    }
                                    .tint(.yellow)
                                }
                                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                    Button {
                                        settings.toggleFavorite(chatId: chat.id)
                                    } label: {
                                        Label(
                                            settings.isFavorite(chatId: chat.id) ? "Unfavourite" : "Favourite",
                                            systemImage: settings.isFavorite(chatId: chat.id) ? "star.slash.fill" : "star.fill"
                                        )
                                    }
                                    .tint(.yellow)
                                }
                                .contextMenu {
                                    Button(action: { settings.toggleFavorite(chatId: chat.id) }) {
                                        Label(
                                            settings.isFavorite(chatId: chat.id) ? "Remove from Favourites" : "Add to Favourites",
                                            systemImage: settings.isFavorite(chatId: chat.id) ? "star.slash" : "star.fill"
                                        )
                                    }
                                }
                            }
                        }
                        .listStyle(.plain)
                        .scrollContentBackground(.hidden)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Image("TeleStreamLogo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 28, height: 28)
                            .cornerRadius(6)
                        Text("TeleStream")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(Color(hex: "E3E2E7"))
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    // Refresh button only on main page
                    Button(action: { Task { await refreshChats() } }) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(Color(hex: "E3E2E7"))
                            .frame(width: 32, height: 32)
                            .background(Color(hex: "1E1F23"))
                            .clipShape(Circle())
                    }
                }
            }
            .task {
                await refreshChats()
            }
        }
        .id(navigationRootId)
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("PopToChatListRoot"))) { _ in
            withAnimation(.easeInOut(duration: 0.25)) {
                selectedFilter = .all
                searchText = ""
                navigationRootId = UUID()
            }
        }
        .preferredColorScheme(.dark)
    }

    private var filteredChats: [Chat] {
        var list = chats

        switch selectedFilter {
        case .all:
            break
        case .unread:
            list = list.filter { $0.unreadCount > 0 }
        case .favourites:
            list = list.filter { settings.isFavorite(chatId: $0.id) }
        case .groups:
            list = list.filter { isGroup($0) }
        case .channels:
            list = list.filter { isChannel($0) }
        }

        if !searchText.isEmpty {
            list = list.filter { FuzzySearch.matches(query: searchText, target: $0.title) }
                .sorted { FuzzySearch.score(query: searchText, target: $0.title) > FuzzySearch.score(query: searchText, target: $1.title) }
        }

        return list
    }

    private func countForFilter(_ filter: ChatFilter) -> Int? {
        switch filter {
        case .all:
            return nil
        case .unread:
            let count = chats.filter { $0.unreadCount > 0 }.count
            return count > 0 ? count : nil
        case .favourites:
            let count = chats.filter { settings.isFavorite(chatId: $0.id) }.count
            return count > 0 ? count : nil
        case .groups:
            let count = chats.filter { isGroup($0) }.count
            return count > 0 ? count : nil
        case .channels:
            let count = chats.filter { isChannel($0) }.count
            return count > 0 ? count : nil
        }
    }

    private var emptyStateIcon: String {
        switch selectedFilter {
        case .all: return "bubble.left.and.bubble.right"
        case .unread: return "checkmark.message"
        case .favourites: return "star"
        case .groups: return "person.3"
        case .channels: return "megaphone"
        }
    }

    private var emptyStateText: String {
        switch selectedFilter {
        case .all: return "No chats found"
        case .unread: return "No unread messages"
        case .favourites: return "No favourite chats yet"
        case .groups: return "No groups found"
        case .channels: return "No channels found"
        }
    }

    private func isGroup(_ chat: Chat) -> Bool {
        switch chat.type {
        case .chatTypeBasicGroup: return true
        case .chatTypeSupergroup(let info): return !info.isChannel
        default: return false
        }
    }

    private func isChannel(_ chat: Chat) -> Bool {
        switch chat.type {
        case .chatTypeSupergroup(let info): return info.isChannel
        default: return false
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
}

// MARK: - WhatsApp-style Filter Pill

struct FilterPillButton: View {
    let title: String
    let count: Int?
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title)
                    .font(.system(size: 14, weight: isSelected ? .semibold : .medium))
                    .foregroundColor(isSelected ? .white : Color(hex: "C1C6D7"))

                if let count = count {
                    Text("\(count)")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(isSelected ? Color(hex: "007AFF") : Color(hex: "8B90A0"))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.white : Color(hex: "292A2E"))
                        .clipShape(Capsule())
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 7)
            .background(isSelected ? Color(hex: "007AFF") : Color(hex: "1E1F23"))
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(isSelected ? Color.clear : Color(hex: "343539"), lineWidth: 0.8)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Chat Row (List Style)

struct ChatRow: View {
    let chat: Chat
    @EnvironmentObject var client: TelegramClient
    @ObservedObject var settings = AppSettings.shared
    @State private var avatarPath: String?

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            ZStack(alignment: .bottomTrailing) {
                if let path = avatarPath, let uiImage = UIImage(contentsOfFile: path) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 54, height: 54)
                        .clipShape(Circle())
                } else {
                    Circle()
                        .fill(Color(hex: "292A2E"))
                        .frame(width: 54, height: 54)
                        .overlay(
                            Image(systemName: chatIcon)
                                .font(.system(size: 22))
                                .foregroundColor(Color(hex: "ADC6FF"))
                        )
                }

                // Type badge
                Image(systemName: typeBadgeIcon)
                    .font(.system(size: 9))
                    .foregroundColor(Color(hex: "C8C6C8"))
                    .padding(3.5)
                    .background(Color(hex: "343539"))
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color.black, lineWidth: 1.5))
                    .offset(x: 2, y: 2)
            }

            // Text content
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(chat.title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(Color(hex: "E3E2E7"))
                        .lineLimit(1)

                    if settings.isFavorite(chatId: chat.id) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 11))
                            .foregroundColor(.yellow)
                    }

                    Spacer()

                    if let msg = chat.lastMessage {
                        Text(formatDate(msg.date))
                            .font(.system(size: 12))
                            .foregroundColor(chat.unreadCount > 0 ? Color(hex: "25D366") : Color(hex: "8B90A0"))
                    }
                }

                HStack {
                    if let msg = chat.lastMessage, let preview = messagePreview(msg) {
                        Text(preview)
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "C1C6D7"))
                            .lineLimit(1)
                    } else {
                        Text("No messages yet")
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "8B90A0"))
                    }

                    Spacer()

                    if chat.unreadCount > 0 {
                        Text("\(chat.unreadCount)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.black)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(hex: "25D366"))
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color.black)
        .task {
            if let photo = chat.photo {
                let file = photo.small
                if file.local.isDownloadingCompleted {
                    avatarPath = file.local.path
                } else {
                    avatarPath = await client.downloadPhoto(fileId: file.id)
                }
            }
        }
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
        case .messageVideo(let v): return "🎬 \(v.caption.text.isEmpty ? v.video.fileName : v.caption.text)"
        case .messageText(let t): return t.text.text
        case .messagePhoto: return "📷 Photo"
        case .messageDocument(let d): return "📄 \(d.document.fileName)"
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

