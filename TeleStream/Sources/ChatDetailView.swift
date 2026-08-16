import SwiftUI
import TDLibKit

struct ChatDetailView: View {
    @EnvironmentObject var client: TelegramClient
    let chatId: Int64
    let title: String

    @State private var videos: [Message] = []
    @State private var isLoading = true
    @State private var searchText = ""
    @State private var selectedPlayerItem: ActivePlayerItem? = nil

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
                VStack(spacing: 0) {
                    // Search bar
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(Color(hex: "8B90A0"))
                            .font(.system(size: 16))
                        TextField("", text: $searchText, prompt: Text("Search videos...").foregroundColor(Color(hex: "8B90A0")))
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
                    .padding(.vertical, 8)

                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(filteredVideos, id: \.id) { message in
                                if let info = extractVideoInfo(from: message) {
                                    Button(action: {
                                        selectedPlayerItem = ActivePlayerItem(
                                            fileId: info.fileId,
                                            fileSize: info.fileSize,
                                            fileName: info.fileName,
                                            chatId: chatId,
                                            chatTitle: title,
                                            duration: info.duration,
                                            thumbnailFileId: info.thumbnailFile?.id,
                                            allVideos: allVideosList
                                        )
                                    }) {
                                        if let video = info.video {
                                            VideoCard(video: video, caption: info.caption, timestamp: message.date)
                                        } else {
                                            DocumentVideoCard(fileName: info.fileName, fileSize: info.fileSize, caption: info.caption, timestamp: message.date, fileId: info.fileId, duration: info.duration, thumbnailFile: info.thumbnailFile)
                                        }
                                    }
                                    .buttonStyle(CardPressButtonStyle())
                                    .contentShape(Rectangle())
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 8)
                        .padding(.bottom, 80)
                    }
                }
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .preferredColorScheme(.dark)
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
        .task {
            await refreshVideos()
        }
        .refreshable {
            await refreshVideos()
        }
    }

    private struct VideoInfo {
        let fileId: Int
        let fileSize: Int64
        let fileName: String
        let duration: Int
        let caption: String
        let video: Video?
        let thumbnailFile: TDLibKit.File?
    }

    private func extractVideoInfo(from message: Message) -> VideoInfo? {
        switch message.content {
        case .messageVideo(let vc):
            let v = vc.video
            return VideoInfo(
                fileId: v.video.id,
                fileSize: Int64(v.video.size > 0 ? v.video.size : v.video.expectedSize),
                fileName: v.fileName.isEmpty ? "Video" : v.fileName,
                duration: v.duration,
                caption: vc.caption.text,
                video: v,
                thumbnailFile: v.thumbnail?.file
            )
        case .messageDocument(let dc):
            let d = dc.document
            let size = Int64(d.document.size > 0 ? d.document.size : (d.document.expectedSize > 0 ? d.document.expectedSize : 0))
            return VideoInfo(
                fileId: d.document.id,
                fileSize: size,
                fileName: d.fileName.isEmpty ? "Video" : d.fileName,
                duration: 0,
                caption: dc.caption.text,
                video: nil,
                thumbnailFile: d.thumbnail?.file
            )
        default:
            return nil
        }
    }

    private var allVideosList: [(fileId: Int, fileName: String, fileSize: Int64)] {
        videos.compactMap { message -> (fileId: Int, fileName: String, fileSize: Int64)? in
            guard let info = extractVideoInfo(from: message) else { return nil }
            return (fileId: info.fileId, fileName: info.fileName, fileSize: info.fileSize)
        }
    }

    private var filteredVideos: [Message] {
        let hideBelow = AppSettings.shared.hideClipsBelowMB
        var result = videos

        // Filter by size
        if hideBelow > 0 {
            let minBytes = Int64(hideBelow) * 1024 * 1024
            result = result.filter { msg in
                switch msg.content {
                case .messageVideo(let vc):
                    return Int64(vc.video.video.size) >= minBytes
                case .messageDocument(let dc):
                    return Int64(dc.document.document.size) >= minBytes
                default:
                    return true
                }
            }
        }

        // Fuzzy search
        if !searchText.isEmpty {
            result = result.filter { msg in
                let target = videoSearchTarget(msg)
                return FuzzySearch.matches(query: searchText, target: target)
            }
            result.sort { a, b in
                FuzzySearch.score(query: searchText, target: videoSearchTarget(a)) > FuzzySearch.score(query: searchText, target: videoSearchTarget(b))
            }
        }

        return result
    }

    private func videoSearchTarget(_ msg: Message) -> String {
        switch msg.content {
        case .messageVideo(let vc):
            return "\(vc.video.fileName) \(vc.caption.text)"
        case .messageDocument(let dc):
            return "\(dc.document.fileName) \(dc.caption.text)"
        default:
            return ""
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

struct RemoteThumbnailView: View {
    let thumbnailFile: TDLibKit.File?
    @EnvironmentObject var client: TelegramClient
    @State private var image: UIImage? = nil

    var body: some View {
        ZStack {
            Color(hex: "121317")

            if let img = image {
                Image(uiImage: img)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            }
        }
        .task {
            guard let file = thumbnailFile else { return }
            image = await client.getThumbnail(file: file)
        }
    }
}

struct VideoCard: View {
    let video: Video
    let caption: String
    let timestamp: Int

    private var episodeInfo: EpisodeInfo? {
        EpisodeDetector.detect(from: video.fileName)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .center) {
                RemoteThumbnailView(thumbnailFile: video.thumbnail?.file)
                    .aspectRatio(16/9, contentMode: .fill)
                    .frame(maxWidth: .infinity)
                    .frame(height: 190)
                    .clipped()
                    .cornerRadius(12)

                LinearGradient(
                    colors: [Color.black.opacity(0.1), Color.black.opacity(0.65)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .cornerRadius(12)

                Image(systemName: "play.circle.fill")
                    .font(.system(size: 46))
                    .foregroundColor(.white.opacity(0.85))
                    .shadow(color: .black.opacity(0.6), radius: 6)

                VStack {
                    HStack {
                        if video.width >= 3840 {
                            resolutionBadge("4K HDR")
                        } else if video.width >= 1920 {
                            resolutionBadge("1080p")
                        } else if video.width >= 1280 {
                            resolutionBadge("720p")
                        }
                        if let ep = episodeInfo {
                            Text(ep.displayName)
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color(hex: "ADC6FF").opacity(0.3))
                                .clipShape(Capsule())
                        }
                        Spacer()
                    }
                    Spacer()
                    HStack {
                        // Progress bar if partially watched
                        if let progress = watchProgress, progress > 0.01 && progress < 0.99 {
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Capsule()
                                        .fill(Color.white.opacity(0.3))
                                        .frame(height: 3)
                                    Capsule()
                                        .fill(Color(hex: "ADC6FF"))
                                        .frame(width: geo.size.width * progress, height: 3)
                                }
                            }
                            .frame(height: 3)
                            .padding(.trailing, 8)
                        }
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
            .allowsHitTesting(false)

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

                Text(formatTimestamp(timestamp))
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "8B90A0"))

                if !caption.isEmpty {
                    Text(caption)
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "8B90A0"))
                        .lineLimit(2)
                }
            }
            .padding(12)
            .allowsHitTesting(false)
        }
        .background(Color(hex: "1A1B1F"))
        .cornerRadius(12)
        .contentShape(Rectangle())
    }

    @MainActor private var watchProgress: Double? {
        let pos = AppSettings.shared.playbackPositions[video.video.id]
        guard let p = pos, video.duration > 0 else { return nil }
        return p / Double(video.duration)
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

    private func formatTimestamp(_ ts: Int) -> String {
        let date = Date(timeIntervalSince1970: TimeInterval(ts))
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy 'at' h:mm a"
        return formatter.string(from: date)
    }
}

struct DocumentVideoCard: View {
    let fileName: String
    let fileSize: Int64
    let caption: String
    let timestamp: Int
    let fileId: Int
    let duration: Int
    var thumbnailFile: TDLibKit.File? = nil

    private var episodeInfo: EpisodeInfo? {
        EpisodeDetector.detect(from: fileName)
    }

    private var fileExtension: String {
        (fileName as NSString).pathExtension.uppercased()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .center) {
                if let thumb = thumbnailFile {
                    RemoteThumbnailView(thumbnailFile: thumb)
                        .aspectRatio(16/9, contentMode: .fill)
                        .frame(maxWidth: .infinity)
                        .frame(height: 190)
                        .clipped()
                        .cornerRadius(12)

                    LinearGradient(
                        colors: [Color.black.opacity(0.1), Color.black.opacity(0.65)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .cornerRadius(12)

                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 46))
                        .foregroundColor(.white.opacity(0.85))
                        .shadow(color: .black.opacity(0.6), radius: 6)
                } else {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(hex: "121317"))
                        .aspectRatio(16/9, contentMode: .fit)

                    VStack(spacing: 8) {
                        Image(systemName: "doc.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.white.opacity(0.6))
                        Text(fileExtension)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Color(hex: "ADC6FF"))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color(hex: "ADC6FF").opacity(0.2))
                            .clipShape(Capsule())
                    }
                }

                VStack {
                    HStack {
                        if let ep = episodeInfo {
                            Text(ep.displayName)
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color(hex: "ADC6FF").opacity(0.3))
                                .clipShape(Capsule())
                        }
                        Spacer()
                    }
                    Spacer()
                    HStack {
                        if let progress = watchProgress, progress > 0.01 && progress < 0.99 {
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Capsule().fill(Color.white.opacity(0.3)).frame(height: 3)
                                    Capsule().fill(Color(hex: "ADC6FF")).frame(width: geo.size.width * progress, height: 3)
                                }
                            }
                            .frame(height: 3)
                            .padding(.trailing, 8)
                        }
                        Spacer()
                    }
                }
                .padding(8)
            }
            .allowsHitTesting(false)

            VStack(alignment: .leading, spacing: 4) {
                Text(fileName)
                    .font(.system(size: 15))
                    .foregroundColor(Color(hex: "E3E2E7"))
                    .lineLimit(1)

                Text(formatSize(fileSize))
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "C1C6D7"))

                Text(formatTimestamp(timestamp))
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "8B90A0"))

                if !caption.isEmpty {
                    Text(caption)
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "8B90A0"))
                        .lineLimit(2)
                }
            }
            .padding(12)
            .allowsHitTesting(false)
        }
        .background(Color(hex: "1A1B1F"))
        .cornerRadius(12)
        .contentShape(Rectangle())
    }

    @MainActor private var watchProgress: Double? {
        let pos = AppSettings.shared.playbackPositions[fileId]
        guard let p = pos, duration > 0 else { return nil }
        return p / Double(duration)
    }

    private func formatSize(_ bytes: Int64) -> String {
        let mb = Double(bytes) / (1024 * 1024)
        if mb >= 1024 { return String(format: "%.1f GB", mb / 1024) }
        return String(format: "%.1f MB", mb)
    }

    private func formatTimestamp(_ ts: Int) -> String {
        let date = Date(timeIntervalSince1970: TimeInterval(ts))
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy 'at' h:mm a"
        return formatter.string(from: date)
    }
}
