import SwiftUI
import AVKit
import AVFoundation
import UIKit
import Combine

struct PlayerView: View {
    let fileId: Int
    let fileSize: Int64
    let fileName: String
    var chatId: Int64 = 0
    var chatTitle: String = ""
    var duration: Int = 0
    var allVideos: [(fileId: Int, fileName: String, fileSize: Int64)] = []

    @EnvironmentObject var client: TelegramClient
    @StateObject private var viewModel = PlayerViewModel()
    @Environment(\.dismiss) var dismiss

    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)

            if viewModel.isLoading {
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .stroke(Color.white.opacity(0.2), lineWidth: 2)
                            .frame(width: 48, height: 48)
                        Circle()
                            .trim(from: 0, to: 0.3)
                            .stroke(Color(hex: "ADC6FF"), lineWidth: 2)
                            .frame(width: 48, height: 48)
                            .rotationEffect(.degrees(viewModel.spinAngle))
                            .animation(.linear(duration: 1).repeatForever(autoreverses: false), value: viewModel.spinAngle)
                    }
                    Text("Buffering...")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                        .tracking(0.5)
                }
                .onAppear { viewModel.spinAngle = 360 }
            } else if let error = viewModel.error {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 36))
                        .foregroundColor(Color(hex: "FFB4AB"))
                    Text(error)
                        .font(.system(size: 15))
                        .foregroundColor(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                    Button(action: {
                        viewModel.setup(fileId: fileId, fileSize: fileSize, fileName: fileName, client: client)
                    }) {
                        Text("Retry")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 32)
                            .padding(.vertical, 12)
                            .background(Color(hex: "007AFF"))
                            .cornerRadius(25)
                    }
                }
                .padding()
            } else {
                ZStack(alignment: .bottom) {
                    CustomVideoPlayerView(player: viewModel.player)
                        .edgesIgnoringSafeArea(.all)

                    // Episode controls overlay
                    if viewModel.hasPrevious || viewModel.hasNext {
                        HStack(spacing: 32) {
                            if viewModel.hasPrevious {
                                Button(action: { viewModel.playPrevious() }) {
                                    Image(systemName: "backward.end.fill")
                                        .font(.system(size: 20))
                                        .foregroundColor(.white)
                                        .padding(12)
                                        .background(Color.black.opacity(0.6))
                                        .clipShape(Circle())
                                }
                            }
                            if viewModel.hasNext {
                                Button(action: { viewModel.playNext() }) {
                                    Image(systemName: "forward.end.fill")
                                        .font(.system(size: 20))
                                        .foregroundColor(.white)
                                        .padding(12)
                                        .background(Color.black.opacity(0.6))
                                        .clipShape(Circle())
                                }
                            }
                        }
                        .padding(.bottom, 80)
                    }

                    // Auto-next countdown overlay
                    if viewModel.showAutoNextCountdown {
                        VStack(spacing: 12) {
                            Text("Next episode in \(viewModel.autoNextSeconds)s")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(.white)
                            HStack(spacing: 16) {
                                Button("Play Now") {
                                    viewModel.playNext()
                                }
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.white)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 10)
                                .background(Color(hex: "ADC6FF").opacity(0.3))
                                .cornerRadius(20)

                                Button("Cancel") {
                                    viewModel.cancelAutoNext()
                                }
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                                .padding(.horizontal, 20)
                                .padding(.vertical, 10)
                                .background(Color.white.opacity(0.1))
                                .cornerRadius(20)
                            }
                        }
                        .padding(24)
                        .background(Color.black.opacity(0.85))
                        .cornerRadius(16)
                        .padding(.bottom, 120)
                    }
                }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle(fileName)
        .preferredColorScheme(.dark)
        .onAppear {
            viewModel.chatId = chatId
            viewModel.chatTitle = chatTitle
            viewModel.videoDuration = duration
            viewModel.allVideos = allVideos
            viewModel.onNavigate = { newFileId in
                // Find the video info and navigate
            }
            viewModel.setup(fileId: fileId, fileSize: fileSize, fileName: fileName, client: client)
        }
        .onDisappear {
            viewModel.savePosition()
            viewModel.teardown()
        }
    }
}

@MainActor
class PlayerViewModel: ObservableObject {
    @Published var isLoading = true
    @Published var error: String?
    @Published var spinAngle: Double = 0
    @Published var hasPrevious = false
    @Published var hasNext = false
    @Published var showAutoNextCountdown = false
    @Published var autoNextSeconds = 5

    let player = AVPlayer()
    private var loaderDelegate: TDResourceLoaderDelegate?
    private var statusObserver: NSKeyValueObservation?
    private var timeObserver: Any?
    private var endObserver: NSObjectProtocol?
    private var autoNextTimer: Timer?
    private var currentFileId: Int = 0
    private var currentFileName: String = ""
    private var currentFileSize: Int64 = 0
    private var currentClient: TelegramClient?

    var chatId: Int64 = 0
    var chatTitle: String = ""
    var videoDuration: Int = 0
    var allVideos: [(fileId: Int, fileName: String, fileSize: Int64)] = []
    var onNavigate: ((Int) -> Void)?

    private var previousFileId: Int?
    private var nextFileId: Int?

    func setup(fileId: Int, fileSize: Int64, fileName: String, client: TelegramClient) {
        isLoading = true
        error = nil
        currentFileId = fileId
        currentFileName = fileName
        currentFileSize = fileSize
        currentClient = client

        // Detect episodes for prev/next
        let videoList = allVideos.map { (fileId: $0.fileId, fileName: $0.fileName) }
        let neighbors = EpisodeDetector.findNeighbors(currentFileId: fileId, videos: videoList)
        previousFileId = neighbors.prev
        nextFileId = neighbors.next
        hasPrevious = neighbors.prev != nil
        hasNext = neighbors.next != nil

        // Determine content type from file extension
        let mimeType = mimeTypeFor(fileName: fileName)

        let delegate = TDResourceLoaderDelegate(
            fileId: fileId,
            fileSize: fileSize,
            mimeType: mimeType,
            client: client
        )
        self.loaderDelegate = delegate

        let ext = URL(fileURLWithPath: fileName).pathExtension.lowercased()
        let urlExt = ext.isEmpty ? "mp4" : ext
        let url = URL(string: "tdfile://video/\(fileId).\(urlExt)")!
        let asset = AVURLAsset(url: url)
        let queue = DispatchQueue(label: "com.telestream.resourceloader.\(fileId)")
        asset.resourceLoader.setDelegate(delegate, queue: queue)

        let playerItem = AVPlayerItem(asset: asset)

        statusObserver = playerItem.observe(\.status) { [weak self] item, _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                switch item.status {
                case .readyToPlay:
                    self.isLoading = false
                    self.restorePosition()
                    self.player.play()
                case .failed:
                    self.isLoading = false
                    self.error = item.error?.localizedDescription ?? "Failed to load video"
                default:
                    break
                }
            }
        }

        player.replaceCurrentItem(with: playerItem)
        setupPositionTracking()
        setupEndObserver()
    }

    func teardown() {
        cancelAutoNext()
        player.pause()
        player.replaceCurrentItem(with: nil)
        statusObserver?.invalidate()
        statusObserver = nil
        if let obs = timeObserver {
            player.removeTimeObserver(obs)
            timeObserver = nil
        }
        if let obs = endObserver {
            NotificationCenter.default.removeObserver(obs)
            endObserver = nil
        }
        loaderDelegate = nil
    }

    func savePosition() {
        let currentTime = player.currentTime().seconds
        guard currentTime.isFinite && currentTime > 0 else { return }
        AppSettings.shared.savePosition(
            fileId: currentFileId,
            position: currentTime,
            fileName: currentFileName,
            chatId: chatId,
            chatTitle: chatTitle,
            duration: videoDuration
        )
    }

    func playPrevious() {
        guard let prevId = previousFileId,
              let video = allVideos.first(where: { $0.fileId == prevId }),
              let client = currentClient else { return }
        cancelAutoNext()
        teardown()
        setup(fileId: video.fileId, fileSize: video.fileSize, fileName: video.fileName, client: client)
    }

    func playNext() {
        guard let nextId = nextFileId,
              let video = allVideos.first(where: { $0.fileId == nextId }),
              let client = currentClient else { return }
        cancelAutoNext()
        AppSettings.shared.clearPosition(fileId: currentFileId)
        teardown()
        setup(fileId: video.fileId, fileSize: video.fileSize, fileName: video.fileName, client: client)
    }

    func cancelAutoNext() {
        autoNextTimer?.invalidate()
        autoNextTimer = nil
        showAutoNextCountdown = false
    }

    private func restorePosition() {
        if let saved = AppSettings.shared.playbackPositions[currentFileId], saved > 5 {
            let time = CMTime(seconds: saved, preferredTimescale: 600)
            player.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero)
        }
    }

    private func setupPositionTracking() {
        let interval = CMTime(seconds: 5, preferredTimescale: 600)
        timeObserver = player.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.savePosition()
            }
        }
    }

    private func setupEndObserver() {
        endObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                AppSettings.shared.clearPosition(fileId: self.currentFileId)
                if self.hasNext && AppSettings.shared.autoNextEpisode {
                    self.startAutoNextCountdown()
                }
            }
        }
    }

    private func startAutoNextCountdown() {
        autoNextSeconds = 5
        showAutoNextCountdown = true
        autoNextTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] timer in
            Task { @MainActor [weak self] in
                guard let self else { timer.invalidate(); return }
                self.autoNextSeconds -= 1
                if self.autoNextSeconds <= 0 {
                    timer.invalidate()
                    self.playNext()
                }
            }
        }
    }

    private func mimeTypeFor(fileName: String) -> String {
        let ext = URL(fileURLWithPath: fileName).pathExtension.lowercased()
        switch ext {
        case "mkv": return "video/x-matroska"
        case "avi": return "video/x-msvideo"
        case "ts": return "video/mp2t"
        case "mov": return "video/quicktime"
        case "m4v": return "video/x-m4v"
        case "mp4": return "video/mp4"
        default: return "video/mp4"
        }
    }
}

// Custom video player using AVPlayerLayer — no built-in spinner/controls
struct CustomVideoPlayerView: UIViewRepresentable {
    let player: AVPlayer

    func makeUIView(context: Context) -> PlayerUIView {
        let view = PlayerUIView()
        view.playerLayer.player = player
        view.playerLayer.videoGravity = .resizeAspect
        view.backgroundColor = .black
        return view
    }

    func updateUIView(_ uiView: PlayerUIView, context: Context) {
        uiView.playerLayer.player = player
    }
}

class PlayerUIView: UIView {
    override class var layerClass: AnyClass { AVPlayerLayer.self }
    var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
}
