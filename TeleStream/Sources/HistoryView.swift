import SwiftUI

struct HistoryView: View {
    @ObservedObject var settings = AppSettings.shared
    @EnvironmentObject var client: TelegramClient
    @State private var searchText = ""
    @State private var showClearConfirm = false

    private var filteredItems: [ContinueWatchingItem] {
        if searchText.isEmpty {
            return settings.continueWatching
        }
        return settings.continueWatching.filter { item in
            FuzzySearch.matches(query: searchText, target: item.fileName) ||
            FuzzySearch.matches(query: searchText, target: item.chatTitle)
        }
    }

    var body: some View {
        NavigationView {
            ZStack {
                Color.black.edgesIgnoringSafeArea(.all)

                if settings.continueWatching.isEmpty {
                    emptyStateView
                } else {
                    VStack(spacing: 0) {
                        // Search bar
                        HStack(spacing: 8) {
                            Image(systemName: "magnifyingglass")
                                .foregroundColor(Color(hex: "8B90A0"))
                                .font(.system(size: 16))
                            TextField("", text: $searchText, prompt: Text("Search history...").foregroundColor(Color(hex: "8B90A0")))
                                .font(.system(size: 17))
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
                        .cornerRadius(10)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)

                        if filteredItems.isEmpty {
                            Spacer()
                            VStack(spacing: 8) {
                                Image(systemName: "magnifyingglass")
                                    .font(.system(size: 32))
                                    .foregroundColor(Color(hex: "8B90A0"))
                                Text("No matching videos in history")
                                    .font(.system(size: 15))
                                    .foregroundColor(Color(hex: "8B90A0"))
                            }
                            Spacer()
                        } else {
                            ScrollView {
                                LazyVStack(spacing: 12) {
                                    ForEach(filteredItems) { item in
                                        NavigationLink(destination: PlayerView(
                                            fileId: item.fileId,
                                            fileSize: item.fileSize,
                                            fileName: item.fileName,
                                            chatId: item.chatId,
                                            chatTitle: item.chatTitle,
                                            duration: item.duration
                                        )) {
                                            HistoryCard(item: item) {
                                                withAnimation {
                                                    settings.clearPosition(fileId: item.fileId)
                                                }
                                            }
                                        }
                                        .buttonStyle(PlainButtonStyle())
                                    }
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Watch History")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(Color(hex: "ADC6FF"))
                        Text("Watch History")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(Color(hex: "E3E2E7"))
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    if !settings.continueWatching.isEmpty {
                        Button(action: { showClearConfirm = true }) {
                            Text("Clear")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(Color(hex: "FFB4AB"))
                        }
                    }
                }
            }
            .alert("Clear Watch History?", isPresented: $showClearConfirm) {
                Button("Clear All", role: .destructive) {
                    withAnimation {
                        settings.clearAllPositions()
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will remove all saved playback progress and watched videos.")
            }
        }
        .preferredColorScheme(.dark)
    }

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Color(hex: "1E1F23"))
                    .frame(width: 80, height: 80)
                Image(systemName: "play.slash.fill")
                    .font(.system(size: 32))
                    .foregroundColor(Color(hex: "ADC6FF"))
            }

            VStack(spacing: 6) {
                Text("No Watch History")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.white)

                Text("Videos you start watching will automatically appear here so you can easily resume where you left off.")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "8B90A0"))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
        }
        .padding()
    }
}

struct HistoryCard: View {
    let item: ContinueWatchingItem
    let onDelete: () -> Void

    private var episodeInfo: EpisodeInfo? {
        EpisodeDetector.detect(from: item.fileName)
    }

    private var progress: Double {
        guard item.duration > 0 else { return 0.5 }
        return min(max(item.position / Double(item.duration), 0.02), 1.0)
    }

    var body: some View {
        HStack(spacing: 14) {
            // Thumbnail / Icon box
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(hex: "1E1F23"))
                    .frame(width: 84, height: 64)

                Image(systemName: "play.fill")
                    .font(.system(size: 20))
                    .foregroundColor(Color(hex: "ADC6FF"))

                // Mini progress bar on thumbnail
                VStack {
                    Spacer()
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(Color.white.opacity(0.2))
                                .frame(height: 3)
                            Rectangle()
                                .fill(Color(hex: "007AFF"))
                                .frame(width: geo.size.width * progress, height: 3)
                        }
                    }
                    .frame(height: 3)
                }
                .cornerRadius(10)
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    if let ep = episodeInfo {
                        Text(ep.displayName)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(hex: "007AFF"))
                            .clipShape(Capsule())
                    }

                    Text(item.chatTitle)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Color(hex: "ADC6FF"))
                        .lineLimit(1)

                    Spacer()

                    Button(action: onDelete) {
                        Image(systemName: "xmark")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Color(hex: "8B90A0"))
                            .padding(4)
                    }
                }

                Text(item.fileName)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Color(hex: "E3E2E7"))
                    .lineLimit(1)

                HStack(spacing: 8) {
                    Text(formatProgressText(position: item.position, duration: item.duration))
                        .font(.system(size: 12, weight: .regular))
                        .foregroundColor(Color(hex: "8B90A0"))

                    Text("•")
                        .foregroundColor(Color(hex: "565961"))

                    Text(relativeTime(item.lastWatched))
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "8B90A0"))
                }
            }
        }
        .padding(12)
        .background(Color(hex: "121317"))
        .cornerRadius(12)
    }

    private func formatProgressText(position: Double, duration: Int) -> String {
        let posStr = formatTime(Int(position))
        if duration > 0 {
            let durStr = formatTime(duration)
            return "\(posStr) / \(durStr)"
        }
        return "\(posStr) watched"
    }

    private func formatTime(_ seconds: Int) -> String {
        let h = seconds / 3600
        let m = (seconds % 3600) / 60
        let s = seconds % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
        return String(format: "%d:%02d", m, s)
    }

    private func relativeTime(_ timestamp: Double) -> String {
        guard timestamp > 0 else { return "Recently" }
        let diff = Date().timeIntervalSince1970 - timestamp
        if diff < 60 { return "Just now" }
        if diff < 3600 { return "\(Int(diff / 60))m ago" }
        if diff < 86400 { return "\(Int(diff / 3600))h ago" }
        return "\(Int(diff / 86400))d ago"
    }
}
