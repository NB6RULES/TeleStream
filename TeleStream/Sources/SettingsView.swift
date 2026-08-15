import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var client: TelegramClient
    @Environment(\.dismiss) var dismiss
    @State private var cacheSize: String = "Calculating..."
    @State private var isClearing = false

    var body: some View {
        NavigationView {
            List {
                Section("Storage") {
                    HStack {
                        Label("Cache Size", systemImage: "internaldrive")
                        Spacer()
                        Text(cacheSize)
                            .foregroundColor(.secondary)
                    }

                    Button(role: .destructive) {
                        Task { await clearCache() }
                    } label: {
                        HStack {
                            Label("Clear Video Cache", systemImage: "trash")
                            if isClearing {
                                Spacer()
                                ProgressView()
                            }
                        }
                    }
                    .disabled(isClearing)
                }

                Section("Account") {
                    Button(role: .destructive) {
                        Task { await client.logout() }
                    } label: {
                        Label("Log Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }

                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Text("TeleStream")
                        Spacer()
                        Text("Telegram Video Streamer")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .task {
                let size = await client.getCacheSize()
                cacheSize = formatBytes(size)
            }
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
        if mb >= 1024 {
            return String(format: "%.1f GB", mb / 1024)
        }
        return String(format: "%.1f MB", mb)
    }
}
