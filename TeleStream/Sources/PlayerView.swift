import SwiftUI
import AVKit

struct PlayerView: View {
    let fileId: Int
    let fileSize: Int64
    let fileName: String

    @EnvironmentObject var client: TelegramClient
    @StateObject private var viewModel = PlayerViewModel()

    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)

            if viewModel.isLoading {
                VStack(spacing: 12) {
                    ProgressView()
                        .scaleEffect(1.5)
                        .tint(.white)
                    Text("Loading video...")
                        .foregroundColor(.white)
                }
            } else if let error = viewModel.error {
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.largeTitle)
                        .foregroundColor(.yellow)
                    Text(error)
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                    Button("Retry") {
                        viewModel.setup(fileId: fileId, fileSize: fileSize, client: client)
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
            } else {
                VideoPlayer(player: viewModel.player)
                    .edgesIgnoringSafeArea(.all)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle(fileName)
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
