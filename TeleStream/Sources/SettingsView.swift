import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var client: TelegramClient
    @ObservedObject var settings = AppSettings.shared
    @Environment(\.dismiss) var dismiss
    @State private var cacheSize: String = "..."
    @State private var isClearing = false
    @State private var showLogoutConfirm = false
    @State private var showClearConfirm = false
    @State private var showClearPositionsConfirm = false

    var body: some View {
        NavigationView {
            ZStack {
                Color.black.edgesIgnoringSafeArea(.all)

                ScrollView {
                    VStack(spacing: 24) {
                        // Account section
                        settingsSection("ACCOUNT") {
                            VStack(spacing: 0) {
                                HStack(spacing: 12) {
                                    Image(systemName: "person.circle.fill")
                                        .font(.system(size: 44))
                                        .foregroundColor(Color(hex: "ADC6FF"))
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(client.currentUserName.isEmpty ? "User" : client.currentUserName)
                                            .font(.system(size: 17, weight: .semibold))
                                            .foregroundColor(Color(hex: "E3E2E7"))
                                        Text(client.currentUserPhone.isEmpty ? "Telegram Account" : client.currentUserPhone)
                                            .font(.system(size: 15))
                                            .foregroundColor(Color(hex: "C1C6D7"))
                                    }
                                    Spacer()
                                }
                                .padding(16)

                                Divider().background(Color(hex: "343539")).padding(.leading, 72)

                                Button(action: { showLogoutConfirm = true }) {
                                    Text("Log Out")
                                        .font(.system(size: 17))
                                        .foregroundColor(Color(hex: "FFB4AB"))
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(16)
                                }
                            }
                        }

                        // Playback section
                        settingsSection("PLAYBACK") {
                            VStack(spacing: 0) {
                                settingsToggle("Download whole video first", isOn: $settings.downloadWholeFirst)

                                Divider().background(Color(hex: "343539")).padding(.leading, 16)

                                settingsToggle("Auto-play next episode", isOn: $settings.autoNextEpisode)
                            }
                        }

                        // Filters section
                        settingsSection("FILTERS") {
                            VStack(spacing: 0) {
                                HStack {
                                    Text("Hide clips below")
                                        .font(.system(size: 17))
                                        .foregroundColor(Color(hex: "E3E2E7"))
                                    Spacer()
                                    Picker("", selection: $settings.hideClipsBelowMB) {
                                        Text("Off").tag(0)
                                        Text("5 MB").tag(5)
                                        Text("10 MB").tag(10)
                                        Text("25 MB").tag(25)
                                        Text("50 MB").tag(50)
                                        Text("100 MB").tag(100)
                                    }
                                    .pickerStyle(.menu)
                                    .tint(Color(hex: "ADC6FF"))
                                }
                                .padding(16)
                            }
                        }

                        // Storage section
                        settingsSection("STORAGE") {
                            VStack(spacing: 0) {
                                HStack {
                                    Text("Cache Size")
                                        .font(.system(size: 17))
                                        .foregroundColor(Color(hex: "E3E2E7"))
                                    Spacer()
                                    Text(cacheSize)
                                        .font(.system(size: 17))
                                        .foregroundColor(Color(hex: "C1C6D7"))
                                }
                                .padding(16)

                                Divider().background(Color(hex: "343539")).padding(.leading, 16)

                                HStack {
                                    Text("Max Cached Videos")
                                        .font(.system(size: 17))
                                        .foregroundColor(Color(hex: "E3E2E7"))
                                    Spacer()
                                    Stepper("\(settings.maxCachedVideos)", value: $settings.maxCachedVideos, in: 1...20)
                                        .font(.system(size: 17))
                                        .foregroundColor(Color(hex: "C1C6D7"))
                                        .tint(Color(hex: "ADC6FF"))
                                }
                                .padding(16)

                                Divider().background(Color(hex: "343539")).padding(.leading, 16)

                                Button(action: { showClearConfirm = true }) {
                                    HStack {
                                        Text("Clear Video Cache")
                                            .font(.system(size: 17))
                                            .foregroundColor(Color(hex: "FFB4AB"))
                                        Spacer()
                                        if isClearing {
                                            ProgressView()
                                                .tint(Color(hex: "FFB4AB"))
                                        }
                                    }
                                    .padding(16)
                                }
                                .disabled(isClearing)

                                Divider().background(Color(hex: "343539")).padding(.leading, 16)

                                Button(action: { showClearPositionsConfirm = true }) {
                                    Text("Clear Watch History")
                                        .font(.system(size: 17))
                                        .foregroundColor(Color(hex: "FFB4AB"))
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(16)
                                }
                            }
                        }

                        // About
                        VStack(spacing: 8) {
                            Image(systemName: "paperplane.fill")
                                .font(.system(size: 28))
                                .foregroundColor(Color(hex: "ADC6FF"))
                                .frame(width: 56, height: 56)
                                .background(Color(hex: "1E1F23"))
                                .cornerRadius(12)

                            Text("TeleStream")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(Color(hex: "E3E2E7"))
                            Text("Version 1.0.0")
                                .font(.system(size: 13))
                                .foregroundColor(Color(hex: "8B90A0"))
                        }
                        .padding(.top, 16)
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(Color(hex: "ADC6FF"))
                }
            }
            .alert("Log Out", isPresented: $showLogoutConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Log Out", role: .destructive) {
                    Task { await client.logout() }
                }
            } message: {
                Text("This will clear all data and sign you out.")
            }
            .alert("Clear Cache", isPresented: $showClearConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Clear", role: .destructive) {
                    Task { await clearCache() }
                }
            } message: {
                Text("This will delete all cached videos.")
            }
            .alert("Clear History", isPresented: $showClearPositionsConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Clear", role: .destructive) {
                    AppSettings.shared.clearAllPositions()
                }
            } message: {
                Text("This will remove all saved playback positions.")
            }
            .task {
                let size = await client.getCacheSize()
                cacheSize = formatBytes(size)
            }
        }
        .preferredColorScheme(.dark)
    }

    private func settingsToggle(_ title: String, isOn: Binding<Bool>) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 17))
                .foregroundColor(Color(hex: "E3E2E7"))
            Spacer()
            Toggle("", isOn: isOn)
                .tint(Color(hex: "ADC6FF"))
        }
        .padding(16)
    }

    private func settingsSection(_ title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(Color(hex: "C1C6D7"))
                .tracking(0.5)
                .padding(.leading, 16)

            content()
                .background(Color(hex: "1E1F23"))
                .cornerRadius(12)
        }
    }

    private func clearCache() async {
        isClearing = true
        await client.clearCache()
        let size = await client.getCacheSize()
        cacheSize = formatBytes(size)
        isClearing = false
    }

    private func formatBytes(_ bytes: Int64) -> String {
        if bytes == 0 { return "0 MB" }
        let mb = Double(bytes) / (1024 * 1024)
        if mb >= 1024 { return String(format: "%.1f GB", mb / 1024) }
        return String(format: "%.1f MB", mb)
    }
}
