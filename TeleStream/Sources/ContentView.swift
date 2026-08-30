import SwiftUI
import TDLibKit

struct ContentView: View {
    @EnvironmentObject var client: TelegramClient

    var body: some View {
        Group {
            if let state = client.authState {
                switch state {
                case .authorizationStateReady:
                    MainTabView()
                case .authorizationStateWaitOtherDeviceConfirmation,
                     .authorizationStateWaitPhoneNumber,
                     .authorizationStateWaitCode,
                     .authorizationStateWaitPassword,
                     .authorizationStateWaitRegistration:
                    LoginView()
                case .authorizationStateLoggingOut,
                     .authorizationStateClosing,
                     .authorizationStateClosed:
                    ZStack {
                        Color.black.edgesIgnoringSafeArea(.all)
                        VStack(spacing: 12) {
                            ProgressView()
                                .tint(Color(hex: "ADC6FF"))
                            Text("Logging out...")
                                .font(.system(size: 15))
                                .foregroundColor(Color(hex: "8B90A0"))
                        }
                    }
                default:
                    ZStack {
                        Color.black.edgesIgnoringSafeArea(.all)
                        VStack(spacing: 12) {
                            ProgressView()
                                .tint(Color(hex: "ADC6FF"))
                            Text("Connecting to Telegram...")
                                .font(.system(size: 15))
                                .foregroundColor(Color(hex: "8B90A0"))
                        }
                    }
                }
            } else {
                ZStack {
                    Color.black.edgesIgnoringSafeArea(.all)
                    VStack(spacing: 12) {
                        ProgressView()
                            .tint(Color(hex: "ADC6FF"))
                        Text("Starting up...")
                            .font(.system(size: 15))
                            .foregroundColor(Color(hex: "8B90A0"))
                    }
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct MainTabView: View {
    @State private var selectedTab = 0
    @ObservedObject var ipaDownloader = IPADownloader.shared

    private var tabSelectionBinding: Binding<Int> {
        Binding(
            get: { selectedTab },
            set: { newTab in
                if newTab == 0 && selectedTab == 0 {
                    // Tapped Chats tab while already on Chats tab -> Pop back to root all chats page
                    NotificationCenter.default.post(name: NSNotification.Name("PopToChatListRoot"), object: nil)
                }
                selectedTab = newTab
            }
        )
    }

    var body: some View {
        ZStack(alignment: .top) {
            TabView(selection: tabSelectionBinding) {
                ChatListView()
                    .tabItem {
                        Label("Chats", systemImage: "bubble.left.and.bubble.right.fill")
                    }
                    .tag(0)

                HistoryView()
                    .tabItem {
                        Label("History", systemImage: "clock.fill")
                    }
                    .tag(1)

                SettingsView()
                    .tabItem {
                        Label("Settings", systemImage: "gearshape.fill")
                    }
                    .tag(2)
            }
            .accentColor(Color(hex: "007AFF"))
            .preferredColorScheme(.dark)
            .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("SwitchToChatsTab"))) { _ in
                selectedTab = 0
            }

            // Gentle in-app update notification
            if ipaDownloader.isUpdateAvailable && !ipaDownloader.isUpdateNotificationDismissed {
                UpdateBannerView(
                    releaseTag: ipaDownloader.latestRelease?.tagName ?? "vLatest",
                    onUpdate: {
                        withAnimation(.easeInOut) {
                            selectedTab = 2
                            ipaDownloader.dismissNotification()
                        }
                    },
                    onDismiss: {
                        ipaDownloader.dismissNotification()
                    }
                )
                .padding(.top, 54)
                .zIndex(100)
            }
        }
        .task {
            await ipaDownloader.checkForUpdates()
        }
    }
}

struct UpdateBannerView: View {
    let releaseTag: String
    let onUpdate: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: "007AFF"), Color(hex: "5856D6")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 36, height: 36)
                Image(systemName: "sparkles")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
            }

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text("Update Available")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color(hex: "E3E2E7"))
                    Text(releaseTag)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(hex: "007AFF"))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 1.5)
                        .background(Color(hex: "007AFF").opacity(0.18))
                        .clipShape(Capsule())
                }

                Text("A new version of TeleStream is available.")
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "8B90A0"))
                    .lineLimit(1)
            }

            Spacer()

            Button(action: onUpdate) {
                Text("Update")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color(hex: "007AFF"))
                    .clipShape(Capsule())
            }

            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color(hex: "8B90A0"))
                    .padding(6)
                    .background(Color.white.opacity(0.08))
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(hex: "17181C").opacity(0.96))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color(hex: "007AFF").opacity(0.3), lineWidth: 1)
                )
        )
        .shadow(color: Color.black.opacity(0.4), radius: 12, y: 4)
        .padding(.horizontal, 16)
        .transition(.asymmetric(
            insertion: .move(edge: .top).combined(with: .opacity),
            removal: .move(edge: .top).combined(with: .opacity)
        ))
    }
}

struct ContinueWatchingRow: View {
    @ObservedObject var settings = AppSettings.shared
    @State private var selectedPlayerItem: ActivePlayerItem? = nil

    var body: some View {
        if !settings.continueWatching.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("RECENTS")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Color(hex: "C1C6D7"))
                        .tracking(0.5)
                    Spacer()
                    Text("\(settings.continueWatching.count) videos")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "8B90A0"))
                }
                .padding(.horizontal, 16)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(settings.continueWatching) { item in
                            Button(action: {
                                selectedPlayerItem = ActivePlayerItem(
                                    fileId: item.fileId,
                                    fileSize: item.fileSize,
                                    fileName: item.fileName,
                                    chatId: item.chatId,
                                    chatTitle: item.chatTitle,
                                    duration: item.duration,
                                    thumbnailFileId: item.thumbnailFileId
                                )
                            }) {
                                ContinueWatchingCard(item: item)
                            }
                            .buttonStyle(CardPressButtonStyle())
                            .contentShape(Rectangle())
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
            .padding(.vertical, 8)
            .fullScreenCover(item: $selectedPlayerItem) { item in
                PlayerView(
                    fileId: item.fileId,
                    fileSize: item.fileSize,
                    fileName: item.fileName,
                    chatId: item.chatId,
                    chatTitle: item.chatTitle,
                    duration: item.duration,
                    thumbnailFileId: item.thumbnailFileId,
                    allVideos: item.allVideos
                )
            }
        }
    }
}

struct ContinueWatchingCard: View {
    let item: ContinueWatchingItem

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ZStack {
                FileIdThumbnailView(fileId: item.thumbnailFileId)
                    .frame(width: 180, height: 100)
                    .clipped()
                    .cornerRadius(8)
                    .overlay(
                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.white.opacity(0.85))
                            .shadow(color: .black.opacity(0.6), radius: 4)
                    )

                // Time remaining label
                VStack {
                    HStack {
                        Spacer()
                        Text(timeRemaining)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color.black.opacity(0.7))
                            .clipShape(Capsule())
                            .padding(6)
                    }
                    Spacer()
                }
                .frame(width: 180, height: 100)

                // Progress bar
                GeometryReader { geo in
                    VStack {
                        Spacer()
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(Color.white.opacity(0.3))
                                .frame(height: 3)
                            Rectangle()
                                .fill(Color(hex: "ADC6FF"))
                                .frame(width: geo.size.width * item.progress, height: 3)
                        }
                    }
                }
                .frame(width: 180, height: 100)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .allowsHitTesting(false)

            Text(item.fileName)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.white)
                .lineLimit(1)
                .frame(width: 180, alignment: .leading)

            Text(item.chatTitle)
                .font(.system(size: 11))
                .foregroundColor(Color(hex: "8B90A0"))
                .lineLimit(1)
                .frame(width: 180, alignment: .leading)
        }
        .contentShape(Rectangle())
    }

    private var timeRemaining: String {
        let remaining = max(0, item.duration - Int(item.position))
        let m = remaining / 60
        let s = remaining % 60
        return "\(m):\(String(format: "%02d", s)) left"
    }

    private var lastWatchedText: String {
        let date = Date(timeIntervalSince1970: item.lastWatched)
        let now = Date()
        let diff = now.timeIntervalSince(date)
        if diff < 3600 { return "\(Int(diff/60))m ago" }
        if diff < 86400 { return "\(Int(diff/3600))h ago" }
        return "\(Int(diff/86400))d ago"
    }
}
