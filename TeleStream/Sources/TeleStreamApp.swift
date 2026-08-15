import SwiftUI

@main
struct TeleStreamApp: App {
    @StateObject private var telegramClient = TelegramClient.shared
    @StateObject private var appSettings = AppSettings.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(telegramClient)
                .environmentObject(appSettings)
        }
    }
}
