import SwiftUI
import AVKit
import AVFoundation
import UIKit
import Combine

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

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Video rendering layer
            CustomVideoPlayerView(player: viewModel.player, videoGravity: viewModel.videoGravity)
                .ignoresSafeArea()
                .onTapGesture {
                    viewModel.toggleControlsVisibility()
                }

            // Unified Centered Buffering Indicator
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

            // Error Overlay with Back buttons
            if let error = viewModel.error {
                ZStack(alignment: .topLeading) {
                    Color.black.ignoresSafeArea()

                    // Centered Error Card
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
                                    viewModel.setup(fileId: fileId, fileSize: fileSize, fileName: fileName, client: client)
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

                    // Top-left Back button
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

            // Custom Player Controls Overlay
            if viewModel.showControls && viewModel.error == nil {
                playerControlsOverlay
                    .transition(.opacity)
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
        }
        .toolbar(.hidden, for: .tabBar)
        .toolbar(.hidden, for: .navigationBar)
        .navigationBarHidden(true)
        .navigationBarBackButtonHidden(true)
        .preferredColorScheme(.dark)
        .onAppear {
            viewModel.chatId = chatId
            viewModel.chatTitle = chatTitle
            viewModel.videoDuration = duration
            viewModel.thumbnailFileId = thumbnailFileId
            viewModel.allVideos = allVideos
            viewModel.setup(fileId: fileId, fileSize: fileSize, fileName: fileName, client: client)
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
                // Top Bar
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

                    // Subtitles Menu
                    Menu {
                        if viewModel.subtitleOptions.isEmpty {
                            Text("No Subtitles Available")
                        } else {
                            ForEach(viewModel.subtitleOptions, id: \.id) { sub in
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

                    // Aspect Ratio Button
                    Button(action: { viewModel.toggleAspect() }) {
                        Image(systemName: viewModel.videoGravity == .resizeAspect ? "arrow.up.left.and.arrow.down.right" : "arrow.down.right.and.arrow.up.left")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)

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
                    // Custom Scrubber Slider
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            // Track background
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.white.opacity(0.3))
                                .frame(height: 6)

                            // Progress
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color(hex: "007AFF"))
                                .frame(width: max(0, min(geo.size.width * viewModel.scrubberProgress, geo.size.width)), height: 6)

                            // Thumb
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

                    // Time labels
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
    @Published var subtitleOptions: [(id: String, name: String, group: AVMediaSelectionGroup, option: AVMediaSelectionOption?)] = []
    @Published var availableRates: [Float] = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 3.0]

    @Published var hasPrevious = false
    @Published var hasNext = false
    @Published var showAutoNextCountdown = false
    @Published var autoNextSeconds = 5

    let player = AVPlayer()
    private var loaderDelegate: TDResourceLoaderDelegate?
    private var statusObserver: NSKeyValueObservation?
    private var timeControlObserver: NSKeyValueObservation?
    private var timeObserver: Any?
    private var endObserver: NSObjectProtocol?
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

    var scrubberProgress: Double {
        guard totalDuration > 0 else { return 0 }
        return min(max(currentPosition / totalDuration, 0.0), 1.0)
    }

    func setup(fileId: Int, fileSize: Int64, fileName: String, client: TelegramClient) {
        isLoading = true
        error = nil
        currentFileId = fileId
        currentFileName = fileName
        currentFileSize = fileSize
        currentClient = client

        // Detect neighbors
        let videoList = allVideos.map { (fileId: $0.fileId, fileName: $0.fileName) }
        let neighbors = EpisodeDetector.findNeighbors(currentFileId: fileId, videos: videoList)
        previousFileId = neighbors.prev
        nextFileId = neighbors.next
        hasPrevious = neighbors.prev != nil
        hasNext = neighbors.next != nil

        let mimeType = mimeTypeFor(fileName: fileName)
        let delegate = TDResourceLoaderDelegate(
            fileId: fileId,
            fileSize: fileSize,
            mimeType: mimeType,
            client: client
        )
        self.loaderDelegate = delegate

        let ext = URL(fileURLWithPath: fileName).pathExtension.lowercased()
        let urlExt = (ext == "mov" || ext == "m4v") ? ext : "mp4"
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
                    let dur = item.duration.seconds
                    if dur.isFinite && dur > 0 {
                        self.totalDuration = dur
                        self.videoDuration = Int(dur)
                    }
                    self.loadSubtitles(for: item)
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
        setupPositionTracking()
        setupEndObserver(for: playerItem)
        resetControlsTimer()
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
            player.pause()
            isPlaying = false
        } else {
            player.playImmediately(atRate: playbackRate)
            isPlaying = true
        }
        resetControlsTimer()
    }

    func setPlaybackRate(_ rate: Float) {
        playbackRate = rate
        if isPlaying {
            player.rate = rate
        }
        resetControlsTimer()
    }

    func toggleAspect() {
        videoGravity = (videoGravity == .resizeAspect) ? .resizeAspectFill : .resizeAspect
        resetControlsTimer()
    }

    func seekRelative(seconds: Double) {
        let current = player.currentTime().seconds
        let target = max(0, min(current + seconds, totalDuration > 0 ? totalDuration : current + seconds))
        seek(to: target)
        resetControlsTimer()
    }

    func seek(to seconds: Double) {
        currentPosition = seconds
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

    func loadSubtitles(for item: AVPlayerItem) {
        guard let group = item.asset.mediaSelectionGroup(forMediaCharacteristic: .legible) else {
            subtitleOptions = []
            return
        }
        var list: [(id: String, name: String, group: AVMediaSelectionGroup, option: AVMediaSelectionOption?)] = [
            (id: "off", name: "Off", group: group, option: nil)
        ]
        for option in group.options {
            let name = option.displayName
            list.append((id: option.displayName, name: name, group: group, option: option))
        }
        self.subtitleOptions = list
    }

    func selectSubtitle(id: String) {
        selectedSubtitleId = id
        guard let selected = subtitleOptions.first(where: { $0.id == id }) else { return }
        if let currentItem = player.currentItem {
            if let opt = selected.option {
                currentItem.select(opt, in: selected.group)
            } else {
                currentItem.select(nil, in: selected.group)
            }
        }
        resetControlsTimer()
    }

    func teardown() {
        controlsTimer?.invalidate()
        controlsTimer = nil
        cancelAutoNext()
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
        loaderDelegate = nil
    }

    func savePosition() {
        let currentTime = player.currentTime().seconds
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
        setup(fileId: video.fileId, fileSize: video.fileSize, fileName: video.fileName, client: client)
    }

    func playNext() {
        guard let nextId = nextFileId,
              let video = allVideos.first(where: { $0.fileId == nextId }),
              let client = currentClient else { return }
        cancelAutoNext()
        teardown()
        setup(fileId: video.fileId, fileSize: video.fileSize, fileName: video.fileName, client: client)
    }

    func cancelAutoNext() {
        autoNextTimer?.invalidate()
        autoNextTimer = nil
        showAutoNextCountdown = false
    }

    private var lastSaveTime: Double = 0

    private func restorePosition() {
        if let saved = AppSettings.shared.playbackPositions[currentFileId], saved > 3 {
            let time = CMTime(seconds: saved, preferredTimescale: 600)
            player.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero)
            currentPosition = saved
            lastSaveTime = saved
        }
    }

    private func setupPositionTracking() {
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

    private func setupEndObserver(for item: AVPlayerItem) {
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

// Custom video player using AVPlayerLayer with dynamic gravity
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

