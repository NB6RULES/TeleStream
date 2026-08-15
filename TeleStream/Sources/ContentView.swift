import SwiftUI
import TDLibKit

struct ContentView: View {
    @EnvironmentObject var client: TelegramClient

    var body: some View {
        Group {
            if let state = client.authState {
                switch state {
                case .authorizationStateReady:
                    ChatListView()
                case .authorizationStateWaitOtherDeviceConfirmation,
                     .authorizationStateWaitPhoneNumber,
                     .authorizationStateWaitCode:
                    LoginView()
                default:
                    ProgressView("Connecting to Telegram...")
                }
            } else {
                ProgressView("Starting up...")
            }
        }
    }
}

struct ContinueWatchingRow: View {
    @ObservedObject var settings = AppSettings.shared

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
                            NavigationLink(destination: PlayerView(
                                fileId: item.fileId,
                                fileSize: 0,
                                fileName: item.fileName,
                                chatId: item.chatId,
                                chatTitle: item.chatTitle,
                                duration: item.duration
                            )) {
                                ContinueWatchingCard(item: item)
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
            .padding(.vertical, 8)
        }
    }
}

struct ContinueWatchingCard: View {
    let item: ContinueWatchingItem

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(hex: "121317"))
                    .frame(width: 180, height: 100)
                    .overlay(
                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.white.opacity(0.7))
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

            Text(item.fileName)
                .font(.system(size: 13))
                .foregroundColor(Color(hex: "E3E2E7"))
                .lineLimit(1)
                .frame(width: 180, alignment: .leading)

            HStack {
                Text(item.chatTitle)
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "8B90A0"))
                    .lineLimit(1)
                Spacer()
                Text(lastWatchedText)
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "8B90A0"))
            }
            .frame(width: 180)
        }
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
