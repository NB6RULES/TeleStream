import SwiftUI
import AVKit

struct PlayerView: View {
    let fileId: Int
    let fileSize: Int64
    let fileName: String

    @EnvironmentObject var client: TelegramClient
    @StateObject private var viewModel = PlayerViewModel()
    @Environment(\.dismiss) var dismiss

    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)

            if viewModel.isLoading {
                // Buffering state matching design
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
                        viewModel.setup(fileId: fileId, fileSize: fileSize, client: client)
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
                VideoPlayer(player: viewModel.player)
                    .edgesIgnoringSafeArea(.all)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle(fileName)
        .preferredColorScheme(.dark)
        .onAppear {
            viewModel.setup(fileId: fileId, fileSize: fileSize, client: client)
        }
        .onDisappear {
            viewModel.teardown()
        }
    }
}

@MainActor
class PlayerViewModel: ObservableObject {
    @Published var isLoading = true
    @Published var error: String?
    @Published var spinAngle: Double = 0

    let player = AVPlayer()
    private var loaderDelegate: TDResourceLoaderDelegate?
    private var statusObserver: NSKeyValueObservation?

    func setup(fileId: Int, fileSize: Int64, client: TelegramClient) {
        isLoading = true
        error = nil

        let delegate = TDResourceLoaderDelegate(
            fileId: fileId,
            fileSize: fileSize,
            mimeType: "video/mp4",
            client: client
        )
        self.loaderDelegate = delegate

        let url = URL(string: "tdfile://video/\(fileId).mp4")!
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
    }

    func teardown() {
        player.pause()
        player.replaceCurrentItem(with: nil)
        statusObserver?.invalidate()
        statusObserver = nil
        loaderDelegate = nil
    }
}
