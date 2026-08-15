import SwiftUI
import TDLibKit

struct ChatDetailView: View {
    @EnvironmentObject var client: TelegramClient
    let chatId: Int64
    let title: String

    @State private var videos: [Message] = []
    @State private var isLoading = true

    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)

            if isLoading && videos.isEmpty {
                ProgressView()
                    .tint(Color(hex: "ADC6FF"))
            } else if videos.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "video.slash")
                        .font(.system(size: 32))
                        .foregroundColor(Color(hex: "8B90A0"))
                    Text("No videos in this chat")
                        .font(.system(size: 15))
                        .foregroundColor(Color(hex: "8B90A0"))
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(videos, id: \.id) { message in
                            if case let .messageVideo(videoContent) = message.content {
                                let video = videoContent.video
                                NavigationLink(destination: PlayerView(
                                    fileId: video.video.id,
                                    fileSize: Int64(video.video.size > 0 ? video.video.size : video.video.expectedSize),
                                    fileName: video.fileName.isEmpty ? "Video" : video.fileName
                                )) {
                                    VideoCard(video: video, caption: videoContent.caption.text)
                                }
                            }
                        }
                    }
                    .padding(16)
                }
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { Task { await refreshVideos() } }) {
                    Image(systemName: "arrow.clockwise")
                        .foregroundColor(Color(hex: "E3E2E7"))
                }
            }
        }
        .task {
            await refreshVideos()
        }
    }

    private func refreshVideos() async {
        isLoading = true
        do {
            videos = try await client.getVideos(in: chatId)
        } catch {
            print("Failed to fetch videos: \(error)")
        }
        isLoading = false
    }
}

struct VideoCard: View {
    let video: Video
    let caption: String

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .center) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(hex: "121317"))
                    .aspectRatio(16/9, contentMode: .fit)

                Image(systemName: "play.circle.fill")
                    .font(.system(size: 44))
                    .foregroundColor(.white.opacity(0.8))

                VStack {
                    HStack {
                        if video.width >= 3840 {
                            resolutionBadge("4K HDR")
                        } else if video.width >= 1920 {
                            resolutionBadge("1080p")
                        } else if video.width >= 1280 {
                            resolutionBadge("720p")
                        }
                        Spacer()
                    }
                    Spacer()
                    HStack {
                        Spacer()
                        Text(formatDuration(video.duration))
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.black.opacity(0.6))
                            .clipShape(Capsule())
                    }
                }
                .padding(8)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(video.fileName.isEmpty ? "Video" : video.fileName)
                    .font(.system(size: 15))
                    .foregroundColor(Color(hex: "E3E2E7"))
                    .lineLimit(1)

                HStack {
                    if video.video.size > 0 {
                        Text(formatSize(video.video.size))
                            .font(.system(size: 13))
                            .foregroundColor(Color(hex: "C1C6D7"))
                    }
                    if video.width > 0 && video.height > 0 {
                        Text("\(video.width)x\(video.height)")
                            .font(.system(size: 13))
                            .foregroundColor(Color(hex: "C1C6D7"))
                    }
                }

                if !caption.isEmpty {
                    Text(caption)
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "8B90A0"))
                        .lineLimit(2)
                }
            }
            .padding(12)
        }
        .background(Color(hex: "1A1B1F"))
        .cornerRadius(12)
    }

    private func resolutionBadge(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .medium))
            .foregroundColor(Color(hex: "ADC6FF"))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color(hex: "ADC6FF").opacity(0.2))
            .clipShape(Capsule())
    }

    private func formatDuration(_ seconds: Int) -> String {
        let h = seconds / 3600
        let m = (seconds % 3600) / 60
        let s = seconds % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
        return String(format: "%d:%02d", m, s)
    }

    private func formatSize(_ bytes: Int64) -> String {
        let mb = Double(bytes) / (1024 * 1024)
        if mb >= 1024 { return String(format: "%.1f GB", mb / 1024) }
        return String(format: "%.1f MB", mb)
    }
}
