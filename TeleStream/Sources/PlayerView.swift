import SwiftUI
import AVKit
import AVFoundation
import UIKit
import Combine
import KSPlayer
import MediaPlayer

struct ActivePlayerItem: Identifiable, Equatable {
    var id: Int { fileId }
    let fileId: Int
    let fileSize: Int64
    let fileName: String
    var chatId: Int64 = 0
    var chatTitle: String = ""
    var duration: Int = 0
    var thumbnailFileId: Int? = nil
    var allVideos: [(fileId: Int, fileName: String, fileSize: Int64)] = []

    static func == (lhs: ActivePlayerItem, rhs: ActivePlayerItem) -> Bool {
        lhs.fileId == rhs.fileId
    }
}

struct MediaOptionItem: Identifiable, Equatable {
    let id: String
    let name: String
    var avOption: AVMediaSelectionOption? = nil
    var avGroup: AVMediaSelectionGroup? = nil
    var ksTrack: MediaPlayerTrack? = nil

    static func == (lhs: MediaOptionItem, rhs: MediaOptionItem) -> Bool {
        lhs.id == rhs.id
    }
}

struct PlayerView: View {
    let fileId: Int
    let fileSize: Int64
    let fileName: String
    var chatId: Int64 = 0
    var chatTitle: String = ""
    var duration: Int = 0
    var thumbnailFileId: Int? = nil
    var allVideos: [(fileId: Int, fileName: String, fileSize: Int64)] = []

    @EnvironmentObject var client: TelegramClient
    @StateObject private var viewModel = PlayerViewModel()
    @Environment(\.dismiss) var dismiss

    @State private var skipBadge: (isLeft: Bool, text: String)? = nil
    @State private var showVolumeHUD = false
    @State private var currentVolume: Float = 0
    @State private var showBrightnessHUD = false
    @State private var currentBrightness: CGFloat = 0
    @State private var showAspectHUD = false
    @State private var aspectHUDText = ""

    @State private var skipTimer: Timer?
    @State private var volumeTimer: Timer?
    @State private var brightnessTimer: Timer?
    @State private var aspectTimer: Timer?

    private var isMKV: Bool {
        let ext = (fileName as NSString).pathExtension.lowercased()
        return ext == "mkv" || ext == "avi" || ext == "webm" || ext == "flv" || ext == "wmv" || ext == "ts"
    }

    private var streamURL: URL {
        LocalStreamServer.shared.start(with: client)
        return LocalStreamServer.shared.streamURL(fileId: fileId, fileSize: fileSize, fileName: fileName)
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                Color.black.ignoresSafeArea()

                // 1. Video Surface Layer (KSPlayer for MKV/non-native, AVPlayer for MP4/MOV)
                if isMKV {
                    KSVideoPlayerSurfaceView(
                        url: streamURL,
                        title: fileName,
                        viewModel: viewModel
                    )
                    .ignoresSafeArea()
                } else {
                    CustomVideoPlayerView(
                        player: viewModel.player,
                        videoGravity: viewModel.videoGravity
                    )
                    .ignoresSafeArea()
                }

                // 2. Gesture Overlay Layer
                GestureOverlayView(
                    onToggleAspect: {
                        viewModel.toggleAspect()
                        triggerAspectHUD()
                    },
                    onSeekRelative: { delta in
                        viewModel.seekRelative(seconds: delta)
                        triggerSkipBadge(isLeft: delta < 0)
                    },
                    onVolumeChanged: { vol in
                        currentVolume = vol
                        triggerVolumeHUD()
                    },
                    onBrightnessChanged: { bright in
                        currentBrightness = bright
                        triggerBrightnessHUD()
                    },
                    onToggleControls: {
                        viewModel.toggleControlsVisibility()
                    }
                )
                .ignoresSafeArea()

                // 3. Unified Centered Buffering Indicator
                if viewModel.isLoading && viewModel.error == nil {
                    VStack(spacing: 12) {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(1.4)
                        Text("Buffering...")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.85))
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 18)
                    .background(Color.black.opacity(0.75))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .transition(.opacity)
                }

                // 4. Floating HUDs at 3/4 distance from bottom of screen (25% from top)
                VStack {
                    Spacer()
                        .frame(height: geometry.size.height * 0.25)

                    // Skip 10s feedback badge
                    if let skip = skipBadge {
                        HStack {
                            if !skip.isLeft { Spacer() }
                            HStack(spacing: 8) {
                                Image(systemName: skip.isLeft ? "gobackward.10" : "goforward.10")
                                    .font(.system(size: 20, weight: .bold))
                                Text(skip.text)
                                    .font(.system(size: 16, weight: .bold))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 12)
                            .background(Color.black.opacity(0.85))
                            .clipShape(Capsule())
                            .padding(.horizontal, 50)
                            .transition(.scale.combined(with: .opacity))
                            if skip.isLeft { Spacer() }
                        }
                    }

                    // Volume HUD (Left side)
                    if showVolumeHUD {
                        HStack {
                            HStack(spacing: 8) {
                                Image(systemName: "speaker.wave.3.fill")
                                    .font(.system(size: 15))
                                    .foregroundColor(.white)
                                Text("Volume: \(Int(currentVolume * 100))%")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.white)
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(Color.black.opacity(0.85))
                            .clipShape(Capsule())
                            .padding(.leading, 24)

                            Spacer()
                        }
                        .transition(.opacity)
                    }

                    // Brightness HUD (Right side)
                    if showBrightnessHUD {
                        HStack {
                            Spacer()
                            HStack(spacing: 8) {
                                Image(systemName: "sun.max.fill")
                                    .font(.system(size: 15))
                                    .foregroundColor(.white)
                                Text("Brightness: \(Int(currentBrightness * 100))%")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.white)
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(Color.black.opacity(0.85))
                            .clipShape(Capsule())
                            .padding(.trailing, 24)
                        }
                        .transition(.opacity)
                    }

                    // Aspect Ratio HUD (Center)
                    if showAspectHUD {
                        HStack(spacing: 8) {
                            Image(systemName: "aspectratio")
                                .font(.system(size: 15))
                                .foregroundColor(.white)
                            Text(aspectHUDText)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.black.opacity(0.85))
                        .clipShape(Capsule())
                        .transition(.opacity)
                    }

                    Spacer()
                }
                .allowsHitTesting(false)

                // 5. Error Overlay with Back / Retry
                if let error = viewModel.error {
                    ZStack(alignment: .topLeading) {
                        Color.black.ignoresSafeArea()

                        VStack {
                            Spacer()
                            VStack(spacing: 16) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.system(size: 44))
                                    .foregroundColor(Color(hex: "FFB4AB"))
                                Text(error)
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.white.opacity(0.9))
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, 24)

                                HStack(spacing: 14) {
                                    Button(action: {
                                        dismiss()
                                    }) {
                                        Text("Back")
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundColor(.white.opacity(0.85))
                                            .padding(.horizontal, 24)
                                            .padding(.vertical, 12)
                                            .background(Color.white.opacity(0.15))
                                            .cornerRadius(24)
                                    }

                                    Button(action: {
                                        viewModel.setup(fileId: fileId, fileSize: fileSize, fileName: fileName, client: client, isMKV: isMKV)
                                    }) {
                                        HStack(spacing: 8) {
                                            Image(systemName: "arrow.clockwise")
                                            Text("Retry")
                                        }
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 28)
                                        .padding(.vertical, 12)
                                        .background(Color(hex: "007AFF"))
                                        .cornerRadius(24)
                                    }
                                }
                            }
                            .padding(24)
                            .background(Color(hex: "1A1B1F"))
                            .cornerRadius(20)
                            .padding(.horizontal, 24)
                            Spacer()
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)

                        Button(action: {
                            dismiss()
                        }) {
                            HStack(spacing: 6) {
                                Image(systemName: "chevron.backward")
                                    .font(.system(size: 16, weight: .bold))
                                Text("Back")
                                    .font(.system(size: 15, weight: .semibold))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(Color.white.opacity(0.18))
                            .clipShape(Capsule())
                        }
                        .padding(.top, 56)
                        .padding(.leading, 20)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .transition(.opacity)
                }

                // 6. Custom Player Controls Overlay (For BOTH MKV and MP4/MOV)
                if viewModel.showControls && viewModel.error == nil {
                    playerControlsOverlay
                        .transition(.opacity)
                }

                // 7. Auto-next countdown overlay
                if viewModel.showAutoNextCountdown {
                    autoNextOverlay
                        .transition(.scale.combined(with: .opacity))
                }
            }
        }
        .toolbar(.hidden, for: .tabBar)
        .toolbar(.hidden, for: .navigationBar)
        .navigationBarHidden(true)
        .navigationBarBackButtonHidden(true)
        .statusBarHidden(true)
        .persistentSystemOverlays(.hidden)
        .preferredColorScheme(.dark)
        .onAppear {
            viewModel.chatId = chatId
            viewModel.chatTitle = chatTitle
            viewModel.videoDuration = duration
            viewModel.thumbnailFileId = thumbnailFileId
            viewModel.allVideos = allVideos
            viewModel.setup(fileId: fileId, fileSize: fileSize, fileName: fileName, client: client, isMKV: isMKV)
            AppSettings.shared.savePosition(
                fileId: fileId,
                fileSize: fileSize,
                position: AppSettings.shared.playbackPositions[fileId] ?? 0,
                fileName: fileName,
                chatId: chatId,
                chatTitle: chatTitle,
                duration: duration,
                thumbnailFileId: thumbnailFileId
            )
        }
        .onDisappear {
            viewModel.savePosition()
            viewModel.teardown()
        }
    }

    private func triggerSkipBadge(isLeft: Bool) {
        withAnimation(.easeOut(duration: 0.15)) {
            skipBadge = (isLeft: isLeft, text: isLeft ? "◀◀ 10s" : "10s ▶▶")
        }
        skipTimer?.invalidate()
        skipTimer = Timer.scheduledTimer(withTimeInterval: 0.8, repeats: false) { _ in
            withAnimation(.easeIn(duration: 0.2)) {
                skipBadge = nil
            }
        }
    }

    private func triggerVolumeHUD() {
        withAnimation(.easeOut(duration: 0.15)) {
            showVolumeHUD = true
        }
        volumeTimer?.invalidate()
        volumeTimer = Timer.scheduledTimer(withTimeInterval: 1.2, repeats: false) { _ in
            withAnimation(.easeIn(duration: 0.2)) {
                showVolumeHUD = false
            }
        }
    }

    private func triggerBrightnessHUD() {
        withAnimation(.easeOut(duration: 0.15)) {
            showBrightnessHUD = true
        }
        brightnessTimer?.invalidate()
        brightnessTimer = Timer.scheduledTimer(withTimeInterval: 1.2, repeats: false) { _ in
            withAnimation(.easeIn(duration: 0.2)) {
                showBrightnessHUD = false
            }
        }
    }

    private func triggerAspectHUD() {
        aspectHUDText = (viewModel.videoGravity == .resizeAspect) ? "Original (Avoid Dynamic Island)" : "Fit to Width (Fill Dynamic Island)"
        withAnimation(.easeOut(duration: 0.15)) {
            showAspectHUD = true
        }
        aspectTimer?.invalidate()
        aspectTimer = Timer.scheduledTimer(withTimeInterval: 1.2, repeats: false) { _ in
            withAnimation(.easeIn(duration: 0.2)) {
                showAspectHUD = false
            }
        }
    }

    private var playerControlsOverlay: some View {
        ZStack {
            // Gradient scrims
            VStack {
                LinearGradient(colors: [Color.black.opacity(0.8), Color.clear], startPoint: .top, endPoint: .bottom)
                    .frame(height: 120)
                Spacer()
                LinearGradient(colors: [Color.clear, Color.black.opacity(0.85)], startPoint: .top, endPoint: .bottom)
                    .frame(height: 140)
            }
            .ignoresSafeArea()
            .allowsHitTesting(false)

            VStack(spacing: 0) {
                // Top Bar (padded 52pt to strictly avoid Dynamic Island / notch)
                HStack(spacing: 12) {
                    Button(action: {
                        viewModel.savePosition()
                        dismiss()
                    }) {
                        Image(systemName: "chevron.backward")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(fileName)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)
                            .lineLimit(1)

                        if !chatTitle.isEmpty {
                            Text(chatTitle)
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "ADC6FF"))
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    // Audio Tracks Menu
                    Menu {
                        if viewModel.audioTrackOptions.isEmpty {
                            Text("Default Audio Track")
                        } else {
                            ForEach(viewModel.audioTrackOptions) { audio in
                                Button(action: { viewModel.selectAudioTrack(id: audio.id) }) {
                                    HStack {
                                        Text(audio.name)
                                        if viewModel.selectedAudioTrackId == audio.id {
                                            Image(systemName: "checkmark")
                                        }
                                    }
                                }
                            }
                        }
                    } label: {
                        Image(systemName: "waveform.badge.magnifyingglass")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }

                    // Subtitles Menu
                    Menu {
                        if viewModel.subtitleOptions.isEmpty {
                            Text("No Subtitles Available")
                        } else {
                            ForEach(viewModel.subtitleOptions) { sub in
                                Button(action: { viewModel.selectSubtitle(id: sub.id) }) {
                                    HStack {
                                        Text(sub.name)
                                        if viewModel.selectedSubtitleId == sub.id {
                                            Image(systemName: "checkmark")
                                        }
                                    }
                                }
                            }
                        }
                    } label: {
                        Image(systemName: viewModel.selectedSubtitleId == "off" ? "captions.bubble" : "captions.bubble.fill")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(viewModel.selectedSubtitleId == "off" ? .white : Color(hex: "ADC6FF"))
                            .padding(10)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }

                    // Speed Menu (0.25x to 3.0x)
                    Menu {
                        ForEach(viewModel.availableRates, id: \.self) { rate in
                            Button(action: { viewModel.setPlaybackRate(rate) }) {
                                HStack {
                                    Text(formatRate(rate))
                                    if abs(viewModel.playbackRate - rate) < 0.01 {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        }
                    } label: {
                        Text(formatRate(viewModel.playbackRate))
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Capsule())
                    }

                    // Aspect Ratio Button (Avoid Dynamic Island vs Fill Dynamic Island)
                    Button(action: {
                        viewModel.toggleAspect()
                        triggerAspectHUD()
                    }) {
                        Image(systemName: viewModel.videoGravity == .resizeAspect ? "arrow.up.left.and.arrow.down.right" : "arrow.down.right.and.arrow.up.left")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 52)

                Spacer()

                // Center Playback Controls
                HStack(spacing: 40) {
                    if viewModel.hasPrevious {
                        Button(action: { viewModel.playPrevious() }) {
                            Image(systemName: "backward.end.fill")
                                .font(.system(size: 22))
                                .foregroundColor(.white)
                                .padding(14)
                                .background(Color.black.opacity(0.5))
                                .clipShape(Circle())
                        }
                    }

                    // 10s back
                    Button(action: { viewModel.seekRelative(seconds: -10) }) {
                        Image(systemName: "gobackward.10")
                            .font(.system(size: 26))
                            .foregroundColor(.white)
                            .padding(14)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }

                    // Play / Pause
                    Button(action: { viewModel.togglePlayPause() }) {
                        Image(systemName: viewModel.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 36))
                            .foregroundColor(.white)
                            .frame(width: 72, height: 72)
                            .background(Color(hex: "007AFF"))
                            .clipShape(Circle())
                            .shadow(color: Color.black.opacity(0.4), radius: 8, x: 0, y: 4)
                    }

                    // 10s forward
                    Button(action: { viewModel.seekRelative(seconds: 10) }) {
                        Image(systemName: "goforward.10")
                            .font(.system(size: 26))
                            .foregroundColor(.white)
                            .padding(14)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }

                    if viewModel.hasNext {
                        Button(action: { viewModel.playNext() }) {
                            Image(systemName: "forward.end.fill")
                                .font(.system(size: 22))
                                .foregroundColor(.white)
                                .padding(14)
                                .background(Color.black.opacity(0.5))
                                .clipShape(Circle())
                        }
                    }
                }

                Spacer()

                // Bottom Scrubber Bar
                VStack(spacing: 8) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.white.opacity(0.3))
                                .frame(height: 6)

                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color(hex: "007AFF"))
                                .frame(width: max(0, min(geo.size.width * viewModel.scrubberProgress, geo.size.width)), height: 6)

                            Circle()
                                .fill(Color.white)
                                .frame(width: 16, height: 16)
                                .shadow(radius: 2)
                                .offset(x: max(0, min(geo.size.width * viewModel.scrubberProgress - 8, geo.size.width - 16)))
                        }
                        .contentShape(Rectangle())
                        .gesture(
                            DragGesture(minimumDistance: 0)
                                .onChanged { value in
                                    viewModel.isScrubbing = true
                                    let fraction = max(0, min(value.location.x / geo.size.width, 1.0))
                                    let targetSec = fraction * max(viewModel.totalDuration, 1.0)
                                    viewModel.currentPosition = targetSec
                                }
                                .onEnded { value in
                                    let fraction = max(0, min(value.location.x / geo.size.width, 1.0))
                                    let targetSec = fraction * max(viewModel.totalDuration, 1.0)
                                    viewModel.seek(to: targetSec)
                                    viewModel.isScrubbing = false
                                }
                        )
                    }
                    .frame(height: 20)

                    HStack {
                        Text(formatTime(Int(viewModel.currentPosition)))
                            .font(.system(size: 13, weight: .medium, design: .monospaced))
                            .foregroundColor(.white.opacity(0.9))

                        Spacer()

                        if viewModel.totalDuration > 0 {
                            Text(formatTime(Int(viewModel.totalDuration)))
                                .font(.system(size: 13, weight: .medium, design: .monospaced))
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
        }
    }

    private var autoNextOverlay: some View {
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
                .background(Color(hex: "007AFF"))
                .cornerRadius(20)

                Button("Cancel") {
                    viewModel.cancelAutoNext()
                }
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.white.opacity(0.7))
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.15))
                .cornerRadius(20)
            }
        }
        .padding(24)
        .background(Color.black.opacity(0.85))
        .cornerRadius(16)
        .padding(.bottom, 100)
    }

    private func formatRate(_ rate: Float) -> String {
        if rate == Float(Int(rate)) {
            return String(format: "%.0fx", rate)
        } else {
            return String(format: "%.2fx", rate).replacingOccurrences(of: "0x", with: "x")
        }
    }

    private func formatTime(_ seconds: Int) -> String {
        let h = seconds / 3600
        let m = (seconds % 3600) / 60
        let s = seconds % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
        return String(format: "%02d:%02d", m, s)
    }
}

@MainActor
class PlayerViewModel: ObservableObject {
    @Published var isLoading = true
    @Published var isPlaying = false
    @Published var error: String?
    @Published var showControls = true
    @Published var isScrubbing = false
    @Published var currentPosition: Double = 0
    @Published var totalDuration: Double = 0
    @Published var playbackRate: Float = 1.0
    @Published var videoGravity: AVLayerVideoGravity = .resizeAspect
    @Published var selectedSubtitleId: String = "off"
    @Published var subtitleOptions: [MediaOptionItem] = []
    @Published var selectedAudioTrackId: String = "default"
    @Published var audioTrackOptions: [MediaOptionItem] = []
    @Published var availableRates: [Float] = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 3.0]

    @Published var hasPrevious = false
    @Published var hasNext = false
    @Published var showAutoNextCountdown = false
    @Published var autoNextSeconds = 5

    var isMKV: Bool = false

    // AVPlayer components
    let player = AVPlayer()
    private var statusObserver: NSKeyValueObservation?
    private var timeControlObserver: NSKeyValueObservation?
    private var timeObserver: Any?
    private var endObserver: NSObjectProtocol?

    // KSPlayer components
    weak var ksPlayerView: CustomKSPlayerView?

    private var autoNextTimer: Timer?
    private var controlsTimer: Timer?

    private var currentFileId: Int = 0
    private var currentFileName: String = ""
    private var currentFileSize: Int64 = 0
    private var currentClient: TelegramClient?

    var chatId: Int64 = 0
    var chatTitle: String = ""
    var videoDuration: Int = 0
    var thumbnailFileId: Int? = nil
    var allVideos: [(fileId: Int, fileName: String, fileSize: Int64)] = []

    private var previousFileId: Int?
    private var nextFileId: Int?
    private var lastSaveTime: Double = 0

    var scrubberProgress: Double {
        guard totalDuration > 0 else { return 0 }
        return min(max(currentPosition / totalDuration, 0.0), 1.0)
    }

    func setup(fileId: Int, fileSize: Int64, fileName: String, client: TelegramClient, isMKV: Bool) {
        self.isMKV = isMKV
        self.isLoading = true
        self.error = nil
        self.currentFileId = fileId
        self.currentFileName = fileName
        self.currentFileSize = fileSize
        self.currentClient = client

        // Detect neighbors
        let videoList = allVideos.map { (fileId: $0.fileId, fileName: $0.fileName) }
        let neighbors = EpisodeDetector.findNeighbors(currentFileId: fileId, videos: videoList)
        previousFileId = neighbors.prev
        nextFileId = neighbors.next
        hasPrevious = neighbors.prev != nil
        hasNext = neighbors.next != nil

        LocalStreamServer.shared.start(with: client)
        let streamURL = LocalStreamServer.shared.streamURL(fileId: fileId, fileSize: fileSize, fileName: fileName)

        if isMKV {
            // Handled via KSVideoPlayerSurfaceView & bindKSPlayer
        } else {
            let asset = AVURLAsset(url: streamURL)
            let playerItem = AVPlayerItem(asset: asset)

            statusObserver = playerItem.observe(\.status) { [weak self] item, _ in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    switch item.status {
                    case .readyToPlay:
                        self.isLoading = false
                        let dur = item.duration.seconds
                        if dur.isFinite && dur > 0 {
                            self.totalDuration = dur
                            self.videoDuration = Int(dur)
                        }
                        self.loadAVSubtitles(for: item)
                        self.loadAVAudioTracks(for: item)
                        self.restorePosition()
                        self.player.playImmediately(atRate: self.playbackRate)
                        self.isPlaying = true
                        self.resetControlsTimer()
                    case .failed:
                        self.isLoading = false
                        self.error = item.error?.localizedDescription ?? "Cannot open video"
                    default:
                        break
                    }
                }
            }

            timeControlObserver = player.observe(\.timeControlStatus) { [weak self] p, _ in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    switch p.timeControlStatus {
                    case .playing:
                        self.isPlaying = true
                        self.isLoading = false
                    case .paused:
                        self.isPlaying = false
                    case .waitingToPlayAtSpecifiedRate:
                        self.isLoading = true
                    @unknown default:
                        break
                    }
                }
            }

            player.replaceCurrentItem(with: playerItem)
            setupAVPositionTracking()
            setupAVEndObserver(for: playerItem)
        }
        resetControlsTimer()
    }

    func bindKSPlayer(playerView: CustomKSPlayerView, url: URL, title: String) {
        self.ksPlayerView = playerView
        self.isLoading = true
        self.error = nil

        playerView.playTimeDidChange = { [weak self] current, total in
            Task { @MainActor [weak self] in
                guard let self else { return }
                if !self.isScrubbing {
                    self.currentPosition = current
                }
                if total > 0 && self.totalDuration <= 0 {
                    self.totalDuration = total
                    self.videoDuration = Int(total)
                }
                if abs(self.currentPosition - self.lastSaveTime) >= 5.0 {
                    self.lastSaveTime = self.currentPosition
                    self.savePosition()
                }
            }
        }

        playerView.onStateChange = { [weak self] state in
            Task { @MainActor [weak self] in
                guard let self else { return }
                switch state {
                case .readyToPlay:
                    self.isLoading = false
                    self.isPlaying = true
                    self.loadKSTracks()
                    self.restorePosition()
                    self.resetControlsTimer()
                case .buffering:
                    self.isLoading = true
                case .bufferFinished:
                    self.isLoading = false
                case .playedToTheEnd:
                    self.isPlaying = false
                    if self.hasNext && AppSettings.shared.autoNextEpisode {
                        self.startAutoNextCountdown()
                    }
                case .error:
                    self.isLoading = false
                    self.error = "Cannot open video"
                default:
                    break
                }
            }
        }

        let resource = KSPlayerResource(url: url, options: KSOptions(), name: title)
        playerView.set(resource: resource)
    }

    func toggleControlsVisibility() {
        withAnimation(.easeInOut(duration: 0.25)) {
            showControls.toggle()
        }
        if showControls {
            resetControlsTimer()
        }
    }

    func resetControlsTimer() {
        controlsTimer?.invalidate()
        controlsTimer = Timer.scheduledTimer(withTimeInterval: 4.0, repeats: false) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                if self.isPlaying && !self.isScrubbing {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        self.showControls = false
                    }
                }
            }
        }
    }

    func togglePlayPause() {
        if isPlaying {
            if isMKV {
                ksPlayerView?.playerLayer?.player.pause()
            } else {
                player.pause()
            }
            isPlaying = false
        } else {
            if isMKV {
                ksPlayerView?.playerLayer?.player.play()
            } else {
                player.playImmediately(atRate: playbackRate)
            }
            isPlaying = true
        }
        resetControlsTimer()
    }

    func setPlaybackRate(_ rate: Float) {
        playbackRate = rate
        if isPlaying {
            if isMKV {
                ksPlayerView?.playerLayer?.player.playbackRate = rate
            } else {
                player.rate = rate
            }
        }
        resetControlsTimer()
    }

    func toggleAspect() {
        videoGravity = (videoGravity == .resizeAspect) ? .resizeAspectFill : .resizeAspect
        if isMKV {
            UIView.animate(withDuration: 0.25) {
                self.ksPlayerView?.contentMode = (self.videoGravity == .resizeAspect) ? .scaleAspectFit : .scaleAspectFill
            }
        }
        resetControlsTimer()
    }

    func seekRelative(seconds: Double) {
        let current = isMKV ? currentPosition : player.currentTime().seconds
        let target = max(0, min(current + seconds, totalDuration > 0 ? totalDuration : current + seconds))
        seek(to: target)
        resetControlsTimer()
    }

    func seek(to seconds: Double) {
        currentPosition = seconds
        if isMKV {
            ksPlayerView?.playerLayer?.player.seek(time: seconds) { [weak self] _ in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    if self.isPlaying {
                        self.ksPlayerView?.playerLayer?.player.playbackRate = self.playbackRate
                    }
                }
            }
        } else {
            let time = CMTime(seconds: seconds, preferredTimescale: 600)
            player.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] _ in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    if self.isPlaying {
                        self.player.rate = self.playbackRate
                    }
                }
            }
        }
    }

    func loadAVSubtitles(for item: AVPlayerItem) {
        guard let group = item.asset.mediaSelectionGroup(forMediaCharacteristic: .legible) else {
            subtitleOptions = []
            return
        }
        var list: [MediaOptionItem] = [
            MediaOptionItem(id: "off", name: "Off", avOption: nil, avGroup: group)
        ]
        for option in group.options {
            list.append(MediaOptionItem(id: option.displayName, name: option.displayName, avOption: option, avGroup: group))
        }
        self.subtitleOptions = list
        if let current = item.currentMediaSelection.selectedMediaOption(in: group) {
            self.selectedSubtitleId = current.displayName
        } else {
            self.selectedSubtitleId = "off"
        }
    }

    func loadKSTracks() {
        guard let player = ksPlayerView?.playerLayer?.player else { return }

        // Audio Tracks
        let audioTracks = player.tracks(mediaType: .audio)
        var aList: [MediaOptionItem] = []
        for (idx, track) in audioTracks.enumerated() {
            let name = track.name.isEmpty ? (track.language ?? "Audio Track \(idx + 1)") : track.name
            aList.append(MediaOptionItem(id: "audio_\(idx)", name: name, ksTrack: track))
        }
        self.audioTrackOptions = aList
        if let first = aList.first {
            self.selectedAudioTrackId = first.id
        }

        // Subtitles
        let subTracks = player.tracks(mediaType: .subtitle)
        var sList: [MediaOptionItem] = [
            MediaOptionItem(id: "off", name: "Off", ksTrack: nil)
        ]
        for (idx, track) in subTracks.enumerated() {
            let name = track.name.isEmpty ? (track.language ?? "Subtitle \(idx + 1)") : track.name
            sList.append(MediaOptionItem(id: "sub_\(idx)", name: name, ksTrack: track))
        }
        self.subtitleOptions = sList
        self.selectedSubtitleId = "off"
    }

    func selectSubtitle(id: String) {
        selectedSubtitleId = id
        guard let selected = subtitleOptions.first(where: { $0.id == id }) else { return }
        if isMKV {
            if let track = selected.ksTrack {
                ksPlayerView?.playerLayer?.player.select(track: track)
            }
        } else {
            if let currentItem = player.currentItem, let group = selected.avGroup {
                if let opt = selected.avOption {
                    currentItem.select(opt, in: group)
                } else {
                    currentItem.select(nil, in: group)
                }
            }
        }
        resetControlsTimer()
    }

    func loadAVAudioTracks(for item: AVPlayerItem) {
        guard let group = item.asset.mediaSelectionGroup(forMediaCharacteristic: .audible) else {
            audioTrackOptions = []
            return
        }
        var list: [MediaOptionItem] = []
        for option in group.options {
            list.append(MediaOptionItem(id: option.displayName, name: option.displayName, avOption: option, avGroup: group))
        }
        self.audioTrackOptions = list
        if let current = item.currentMediaSelection.selectedMediaOption(in: group) {
            self.selectedAudioTrackId = current.displayName
        }
    }

    func selectAudioTrack(id: String) {
        selectedAudioTrackId = id
        guard let selected = audioTrackOptions.first(where: { $0.id == id }) else { return }
        if isMKV {
            if let track = selected.ksTrack {
                ksPlayerView?.playerLayer?.player.select(track: track)
            }
        } else {
            if let currentItem = player.currentItem, let group = selected.avGroup, let opt = selected.avOption {
                currentItem.select(opt, in: group)
            }
        }
        resetControlsTimer()
    }

    func teardown() {
        controlsTimer?.invalidate()
        controlsTimer = nil
        cancelAutoNext()
        if isMKV {
            ksPlayerView?.playerLayer?.player.pause()
            ksPlayerView = nil
        } else {
            player.pause()
            player.replaceCurrentItem(with: nil)
            statusObserver?.invalidate()
            statusObserver = nil
            timeControlObserver?.invalidate()
            timeControlObserver = nil
            if let obs = timeObserver {
                player.removeTimeObserver(obs)
                timeObserver = nil
            }
            if let obs = endObserver {
                NotificationCenter.default.removeObserver(obs)
                endObserver = nil
            }
        }
    }

    func savePosition() {
        let currentTime = isMKV ? currentPosition : player.currentTime().seconds
        let pos = (currentTime.isFinite && currentTime > 0) ? currentTime : (AppSettings.shared.playbackPositions[currentFileId] ?? 0)
        AppSettings.shared.savePosition(
            fileId: currentFileId,
            fileSize: currentFileSize,
            position: pos,
            fileName: currentFileName,
            chatId: chatId,
            chatTitle: chatTitle,
            duration: videoDuration,
            thumbnailFileId: thumbnailFileId
        )
    }

    func playPrevious() {
        guard let prevId = previousFileId,
              let video = allVideos.first(where: { $0.fileId == prevId }),
              let client = currentClient else { return }
        cancelAutoNext()
        teardown()
        let ext = (video.fileName as NSString).pathExtension.lowercased()
        let isM = ext == "mkv" || ext == "avi" || ext == "webm" || ext == "flv" || ext == "wmv" || ext == "ts"
        setup(fileId: video.fileId, fileSize: video.fileSize, fileName: video.fileName, client: client, isMKV: isM)
    }

    func playNext() {
        guard let nextId = nextFileId,
              let video = allVideos.first(where: { $0.fileId == nextId }),
              let client = currentClient else { return }
        cancelAutoNext()
        teardown()
        let ext = (video.fileName as NSString).pathExtension.lowercased()
        let isM = ext == "mkv" || ext == "avi" || ext == "webm" || ext == "flv" || ext == "wmv" || ext == "ts"
        setup(fileId: video.fileId, fileSize: video.fileSize, fileName: video.fileName, client: client, isMKV: isM)
    }

    func cancelAutoNext() {
        autoNextTimer?.invalidate()
        autoNextTimer = nil
        showAutoNextCountdown = false
    }

    private func restorePosition() {
        if let saved = AppSettings.shared.playbackPositions[currentFileId], saved > 3 {
            if isMKV {
                ksPlayerView?.playerLayer?.player.seek(time: saved) { _ in }
            } else {
                let time = CMTime(seconds: saved, preferredTimescale: 600)
                player.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero)
            }
            currentPosition = saved
            lastSaveTime = saved
        }
    }

    private func setupAVPositionTracking() {
        let interval = CMTime(seconds: 0.5, preferredTimescale: 600)
        timeObserver = player.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            Task { @MainActor [weak self] in
                guard let self else { return }
                if !self.isScrubbing {
                    self.currentPosition = time.seconds
                }
                let dur = self.player.currentItem?.duration.seconds ?? 0
                if dur.isFinite && dur > 0 && self.totalDuration <= 0 {
                    self.totalDuration = dur
                    self.videoDuration = Int(dur)
                }

                if abs(self.currentPosition - self.lastSaveTime) >= 5.0 {
                    self.lastSaveTime = self.currentPosition
                    self.savePosition()
                }
            }
        }
    }

    private func setupAVEndObserver(for item: AVPlayerItem) {
        if let obs = endObserver {
            NotificationCenter.default.removeObserver(obs)
            endObserver = nil
        }
        endObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: item,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.isPlaying = false
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
}

// Transparent gesture coordinator overlay
struct GestureOverlayView: UIViewRepresentable {
    var onToggleAspect: (() -> Void)? = nil
    var onSeekRelative: ((Double) -> Void)? = nil
    var onVolumeChanged: ((Float) -> Void)? = nil
    var onBrightnessChanged: ((CGFloat) -> Void)? = nil
    var onToggleControls: (() -> Void)? = nil

    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .clear

        let coordinator = context.coordinator
        coordinator.onToggleAspect = onToggleAspect
        coordinator.onSeekRelative = onSeekRelative
        coordinator.onVolumeChanged = onVolumeChanged
        coordinator.onBrightnessChanged = onBrightnessChanged
        coordinator.onToggleControls = onToggleControls

        // 1. Pinch
        let pinch = UIPinchGestureRecognizer(target: coordinator, action: #selector(GestureCoordinator.handlePinch(_:)))
        pinch.delegate = coordinator
        view.addGestureRecognizer(pinch)

        // 2. Double Tap
        let doubleTap = UITapGestureRecognizer(target: coordinator, action: #selector(GestureCoordinator.handleDoubleTap(_:)))
        doubleTap.numberOfTapsRequired = 2
        doubleTap.delegate = coordinator
        view.addGestureRecognizer(doubleTap)

        // 3. Single Tap
        let singleTap = UITapGestureRecognizer(target: coordinator, action: #selector(GestureCoordinator.handleSingleTap(_:)))
        singleTap.numberOfTapsRequired = 1
        singleTap.delegate = coordinator
        singleTap.require(toFail: doubleTap)
        view.addGestureRecognizer(singleTap)

        // 4. Pan for Volume & Brightness
        let pan = UIPanGestureRecognizer(target: coordinator, action: #selector(GestureCoordinator.handlePan(_:)))
        pan.delegate = coordinator
        view.addGestureRecognizer(pan)

        coordinator.setupVolumeView(in: view)

        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {}

    func makeCoordinator() -> GestureCoordinator {
        GestureCoordinator()
    }
}

class GestureCoordinator: NSObject, UIGestureRecognizerDelegate {
    var onToggleAspect: (() -> Void)?
    var onSeekRelative: ((Double) -> Void)?
    var onVolumeChanged: ((Float) -> Void)?
    var onBrightnessChanged: ((CGFloat) -> Void)?
    var onToggleControls: (() -> Void)?

    private let volumeView = MPVolumeView(frame: CGRect(x: -1000, y: -1000, width: 1, height: 1))
    private var volumeSlider: UISlider?
    private var initialVolume: Float = 0
    private var initialBrightness: CGFloat = 0
    private var panSide: PanSide = .none

    enum PanSide {
        case none
        case leftVolume
        case rightBrightness
    }

    func setupVolumeView(in view: UIView) {
        volumeView.alpha = 0.0001
        volumeView.clipsToBounds = true
        view.addSubview(volumeView)
        for sub in volumeView.subviews {
            if let slider = sub as? UISlider {
                self.volumeSlider = slider
                break
            }
        }
    }

    @objc func handleSingleTap(_ gesture: UITapGestureRecognizer) {
        onToggleControls?()
    }

    @objc func handlePinch(_ gesture: UIPinchGestureRecognizer) {
        guard gesture.state == .ended else { return }
        if gesture.scale > 1.15 || gesture.scale < 0.85 {
            onToggleAspect?()
        }
    }

    @objc func handleDoubleTap(_ gesture: UITapGestureRecognizer) {
        guard let view = gesture.view else { return }
        let location = gesture.location(in: view)
        let isLeft = location.x < view.bounds.width / 2
        let delta: Double = isLeft ? -10.0 : 10.0
        onSeekRelative?(delta)
    }

    @objc func handlePan(_ gesture: UIPanGestureRecognizer) {
        guard let view = gesture.view else { return }
        let location = gesture.location(in: view)
        let translation = gesture.translation(in: view)
        let velocity = gesture.velocity(in: view)

        switch gesture.state {
        case .began:
            if abs(velocity.y) > abs(velocity.x) {
                if location.x < view.bounds.width / 2 {
                    panSide = .leftVolume
                    initialVolume = AVAudioSession.sharedInstance().outputVolume
                } else {
                    panSide = .rightBrightness
                    initialBrightness = UIScreen.main.brightness
                }
            }
        case .changed:
            let delta = -Float(translation.y / (view.bounds.height * 0.55))
            if panSide == .leftVolume {
                let newVol = max(0, min(1.0, initialVolume + delta))
                volumeSlider?.value = newVol
                onVolumeChanged?(newVol)
            } else if panSide == .rightBrightness {
                let newBright = max(0, min(1.0, Float(initialBrightness) + delta))
                UIScreen.main.brightness = CGFloat(newBright)
                onBrightnessChanged?(CGFloat(newBright))
            }
        case .ended, .cancelled:
            panSide = .none
        default:
            break
        }
    }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
        return false
    }
}

// Custom KSPlayer subclass to hook into player state transitions
final class CustomKSPlayerView: IOSVideoPlayerView {
    var onStateChange: ((KSPlayerState) -> Void)?

    override func player(layer: KSPlayerLayer, state: KSPlayerState) {
        super.player(layer: layer, state: state)
        onStateChange?(state)
    }

    override func updateUI(isLandscape: Bool) {
        super.updateUI(isLandscape: isLandscape)
        toolBar.isHidden = true
        navigationBar.isHidden = true
        subviews.forEach { view in
            // Hide all KSPlayer specific subviews except the playerLayer which is a CALayer
            if view != self {
                view.isHidden = true
            }
        }
    }
}

// KSPlayer video surface for MKV / AVI / WebM / TS
struct KSVideoPlayerSurfaceView: UIViewRepresentable {
    let url: URL
    let title: String
    @ObservedObject var viewModel: PlayerViewModel

    func makeUIView(context: Context) -> CustomKSPlayerView {
        KSOptions.firstPlayerType = KSMEPlayer.self
        KSOptions.secondPlayerType = KSMEPlayer.self
        KSOptions.canBackgroundPlay = true
        KSOptions.isAutoPlay = true
        KSOptions.isSeekedAutoPlay = true

        let playerView = CustomKSPlayerView()
        playerView.toolBar.isHidden = true
        playerView.navigationBar.isHidden = true
        playerView.backgroundColor = .black
        playerView.contentMode = (viewModel.videoGravity == .resizeAspect) ? .scaleAspectFit : .scaleAspectFill

        // Disable internal gestures on KSPlayer so our GestureOverlayView has full priority
        for g in playerView.gestureRecognizers ?? [] {
            g.isEnabled = false
        }

        viewModel.bindKSPlayer(playerView: playerView, url: url, title: title)

        return playerView
    }

    func updateUIView(_ uiView: CustomKSPlayerView, context: Context) {
        UIView.animate(withDuration: 0.25) {
            uiView.contentMode = (viewModel.videoGravity == .resizeAspect) ? .scaleAspectFit : .scaleAspectFill
        }
    }
}

// AVPlayer video surface for MP4 / MOV / M4V
struct CustomVideoPlayerView: UIViewRepresentable {
    let player: AVPlayer
    let videoGravity: AVLayerVideoGravity

    func makeUIView(context: Context) -> PlayerUIView {
        let view = PlayerUIView()
        view.playerLayer.player = player
        view.playerLayer.videoGravity = videoGravity
        view.backgroundColor = .black
        return view
    }

    func updateUIView(_ uiView: PlayerUIView, context: Context) {
        uiView.playerLayer.player = player
        uiView.playerLayer.videoGravity = videoGravity
    }
}

class PlayerUIView: UIView {
    override class var layerClass: AnyClass { AVPlayerLayer.self }
    var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
}
