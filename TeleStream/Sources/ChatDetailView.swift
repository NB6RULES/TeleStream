import SwiftUI
import TDLibKit

struct ChatDetailView: View {
    @EnvironmentObject var client: TelegramClient
    let chatId: Int64
    let title: String

    @State private var videos: [Message] = []
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading && videos.isEmpty {
                ProgressView("Loading videos...")
            } else if videos.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "video.slash")
                        .font(.largeTitle)
                        .foregroundColor(.secondary)
                    Text("No videos in this chat")
                        .foregroundColor(.secondary)
                }
            } else {
                List(videos, id: \.id) { message in
                    if case let .messageVideo(videoContent) = message.content {
                        let video = videoContent.video
                        NavigationLink(destination: PlayerView(
                            fileId: video.video.id,
                            fileSize: Int64(video.video.size > 0 ? video.video.size : video.video.expectedSize),
                            fileName: video.fileName.isEmpty ? "Video" : video.fileName
                        )) {
                            VideoRow(video: video, caption: videoContent.caption.text)
                        }
                    }
                }
            }
        }
        .navigationTitle(title)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { Task { await refreshVideos() } }) {
                    Image(systemName: "arrow.clockwise")
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

struct VideoRow: View {
    let video: Video
    let caption: String

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 60, height: 44)
                Image(systemName: "play.circle.fill")
                    .font(.title2)
                    .foregroundColor(.blue)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(video.fileName.isEmpty ? "Video" : video.fileName)
                    .font(.body)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    Label(formatDuration(video.duration), systemImage: "clock")
                    if video.video.size > 0 {
                        Label(formatSize(video.video.size), systemImage: "doc")
                    }
                    if video.width > 0 && video.height > 0 {
                        Text("\(video.width)×\(video.height)")
                    }
                }
                .font(.caption)
                .foregroundColor(.secondary)

                if !caption.isEmpty {
                    Text(caption)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func formatDuration(_ seconds: Int) -> String {
        let m = seconds / 60
        let s = seconds % 60
        return String(format: "%d:%02d", m, s)
    }

    private func formatSize(_ bytes: Int64) -> String {
        let mb = Double(bytes) / (1024 * 1024)
        if mb >= 1024 {
            return String(format: "%.1f GB", mb / 1024)
        }
        return String(format: "%.1f MB", mb)
    }
}
