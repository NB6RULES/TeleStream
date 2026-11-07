import SwiftUI

@main
struct TeleStreamApp: App {
    @StateObject private var telegramClient = TelegramClient.shared
    @StateObject private var appSettings = AppSettings.shared
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(telegramClient)
                .environmentObject(appSettings)
                .onAppear {
                    LocalStreamServer.shared.start(with: telegramClient)
                }
        }
        .onChange(of: scenePhase) { phase in
            if phase == .active {
                // iOS kills listening sockets while the app is suspended; bring the
                // local stream server back before the user opens a video.
                LocalStreamServer.shared.restartIfNeeded(with: telegramClient)
            }
        }
    }
}
