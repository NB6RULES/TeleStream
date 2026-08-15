import SwiftUI
import TDLibKit

struct ContentView: View {
    @EnvironmentObject var client: TelegramClient

    var body: some View {
        Group {
            if let state = client.authState {
                switch state {
                case .authorizationStateReady:
                    ChatListView()
                case .authorizationStateWaitOtherDeviceConfirmation,
                     .authorizationStateWaitPhoneNumber,
                     .authorizationStateWaitCode:
                    LoginView()
                default:
                    ProgressView("Connecting to Telegram...")
                }
            } else {
                ProgressView("Starting up...")
            }
        }
    }
}
