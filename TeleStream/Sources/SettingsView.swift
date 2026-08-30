import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var client: TelegramClient
    @ObservedObject var settings = AppSettings.shared
    @StateObject private var ipaDownloader = IPADownloader.shared
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

                        // Updates & IPA Download section
                        settingsSection("UPDATES & INSTALLATION") {
                            VStack(spacing: 0) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text("Latest GitHub Release")
                                            .font(.system(size: 17))
                                            .foregroundColor(Color(hex: "E3E2E7"))
                                        Text(ipaDownloader.latestRelease?.tagName ?? "Checking...")
                                            .font(.system(size: 13))
                                            .foregroundColor(Color(hex: "8B90A0"))
                                    }
                                    Spacer()
                                    Button(action: {
                                        Task { await ipaDownloader.checkForUpdates() }
                                    }) {
                                        if ipaDownloader.isChecking {
                                            ProgressView()
                                                .tint(Color(hex: "ADC6FF"))
                                        } else {
                                            Image(systemName: "arrow.clockwise")
                                                .font(.system(size: 16))
                                                .foregroundColor(Color(hex: "ADC6FF"))
                                                .padding(6)
                                        }
                                    }
                                }
                                .padding(16)

                                Divider().background(Color(hex: "343539")).padding(.leading, 16)

                                if ipaDownloader.isDownloading {
                                    VStack(spacing: 10) {
                                        HStack {
                                            Text("Downloading TeleStream.ipa")
                                                .font(.system(size: 15, weight: .medium))
                                                .foregroundColor(Color(hex: "E3E2E7"))
                                            Spacer()
                                            Text(ipaDownloader.downloadSpeed)
                                                .font(.system(size: 13, weight: .semibold, design: .monospaced))
                                                .foregroundColor(Color(hex: "ADC6FF"))
                                        }

                                        ProgressView(value: ipaDownloader.progress)
                                            .tint(Color(hex: "007AFF"))

                                        HStack {
                                            Text("\(IPADownloader.formatBytes(ipaDownloader.bytesWritten)) / \(IPADownloader.formatBytes(ipaDownloader.totalBytesExpected))")
                                                .font(.system(size: 12))
                                                .foregroundColor(Color(hex: "8B90A0"))
                                            Spacer()
                                            Button("Cancel") {
                                                ipaDownloader.cancelDownload()
                                            }
                                            .font(.system(size: 13, weight: .medium))
                                            .foregroundColor(Color(hex: "FFB4AB"))
                                        }
                                    }
                                    .padding(16)
                                } else {
                                    Button(action: {
                                        if ipaDownloader.downloadedFileURL != nil {
                                            ipaDownloader.showShareSheet = true
                                        } else {
                                            ipaDownloader.startDownload()
                                        }
                                    }) {
                                        HStack(spacing: 12) {
                                            Image(systemName: ipaDownloader.downloadedFileURL != nil ? "square.and.arrow.up.fill" : "arrow.down.circle.fill")
                                                .font(.system(size: 20))
                                                .foregroundColor(Color(hex: "007AFF"))
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(ipaDownloader.downloadedFileURL != nil ? "Save / Export TeleStream.ipa" : "Download Latest TeleStream.ipa")
                                                    .font(.system(size: 16, weight: .semibold))
                                                    .foregroundColor(Color(hex: "E3E2E7"))
                                                Text(ipaDownloader.downloadedFileURL != nil ? "Tap to open share sheet or save to Files" : "Direct download from official repository")
                                                    .font(.system(size: 12))
                                                    .foregroundColor(Color(hex: "8B90A0"))
                                            }
                                            Spacer()
                                            Image(systemName: "chevron.right")
                                                .font(.system(size: 13))
                                                .foregroundColor(Color(hex: "8B90A0"))
                                        }
                                        .padding(16)
                                    }
                                }

                                if let error = ipaDownloader.errorMessage {
                                    Divider().background(Color(hex: "343539")).padding(.leading, 16)
                                    Text(error)
                                        .font(.system(size: 13))
                                        .foregroundColor(Color(hex: "FFB4AB"))
                                        .padding(16)
                                }

                                Divider().background(Color(hex: "343539")).padding(.leading, 16)

                                // Sideloading direct links
                                HStack(spacing: 12) {
                                    if let sideStoreUrl = URL(string: "sidestore://source?url=https://raw.githubusercontent.com/NB6RULES/TeleStream/main/sources.json") {
                                        Link(destination: sideStoreUrl) {
                                            HStack(spacing: 6) {
                                                Image(systemName: "arrow.triangle.2.circlepath")
                                                Text("SideStore")
                                            }
                                            .font(.system(size: 13, weight: .medium))
                                            .foregroundColor(Color(hex: "ADC6FF"))
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 8)
                                            .background(Color(hex: "292A2E"))
                                            .cornerRadius(8)
                                        }
                                    }

                                    if let altStoreUrl = URL(string: "altstore://source?url=https://raw.githubusercontent.com/NB6RULES/TeleStream/main/sources.json") {
                                        Link(destination: altStoreUrl) {
                                            HStack(spacing: 6) {
                                                Image(systemName: "shippingbox.fill")
                                                Text("AltStore")
                                            }
                                            .font(.system(size: 13, weight: .medium))
                                            .foregroundColor(Color(hex: "ADC6FF"))
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 8)
                                            .background(Color(hex: "292A2E"))
                                            .cornerRadius(8)
                                        }
                                    }
                                }
                                .padding(16)
                            }
                        }

                        // About
                        VStack(spacing: 8) {
                            Image("TeleStreamLogo")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 56, height: 56)
                                .cornerRadius(12)

                            Text("TeleStream")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(Color(hex: "E3E2E7"))
                            Text("Version \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.08")")
                                .font(.system(size: 13))
                                .foregroundColor(Color(hex: "8B90A0"))

                            Link(destination: ipaDownloader.websiteURL) {
                                HStack(spacing: 6) {
                                    Image(systemName: "globe")
                                        .font(.system(size: 13, weight: .semibold))
                                    Text("Visit Official Website")
                                        .font(.system(size: 13, weight: .semibold))
                                    Image(systemName: "arrow.up.right")
                                        .font(.system(size: 10, weight: .bold))
                                }
                                .foregroundColor(Color(hex: "ADC6FF"))
                                .padding(.horizontal, 14)
                                .padding(.vertical, 7)
                                .background(Color(hex: "1E1F23"))
                                .clipShape(Capsule())
                                .overlay(
                                    Capsule()
                                        .stroke(Color(hex: "ADC6FF").opacity(0.3), lineWidth: 1)
                                )
                            }
                            .padding(.top, 4)
                        }
                        .padding(.top, 16)
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $ipaDownloader.showShareSheet) {
                if let fileUrl = ipaDownloader.downloadedFileURL {
                    ShareSheet(activityItems: [fileUrl])
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
                await ipaDownloader.checkForUpdates()
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
