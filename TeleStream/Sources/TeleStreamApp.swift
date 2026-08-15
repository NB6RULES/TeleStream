import SwiftUI

@main
struct TeleStreamApp: App {
    @StateObject private var telegramClient = TelegramClient.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(telegramClient)
        }
    }
}
