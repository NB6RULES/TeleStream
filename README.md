# TeleStream

A high-performance Telegram video streaming client, available for both **iOS** and **Web**. Stream videos from your Telegram chats instantly without waiting for full downloads.

*Disclaimer: This is an unofficial third-party client and is not affiliated with Telegram.*

## 🌐 TeleStream Web

The Web version of TeleStream runs entirely in your browser using a zero-backend WASM architecture. It acts as a local proxy to stream MTProto video chunks directly into a custom video player.

- 🚀 **[Launch TeleStream Web](https://NB6RULES.github.io/TeleStream/)**

### Web Features
- **Zero Backend**: Connects directly to Telegram's official MTProto servers via WebAssembly (WASM).
- **Instant Playback**: Streams video chunks dynamically using a local Service Worker interceptor.
- **Picture-in-Picture**: Watch videos while navigating your chats.
- **Persistent Caching**: Uses IndexedDB to cache thumbnails and avatars for lightning-fast subsequent loads.
- **Network Diagnostics**: Built-in HUD to monitor streaming speeds and buffer health.

---

## 📱 TeleStream iOS

The native iOS client provides a fully integrated streaming experience for iPhone and iPad users.

- 🚀 **[Direct Download: TeleStream.ipa](https://github.com/NB6RULES/TeleStream/releases/latest/download/TeleStream.ipa)**
- 📦 **[View All Releases & Changelog](https://github.com/NB6RULES/TeleStream/releases/latest)**

### iOS Features
- Sign in via Telegram QR code or phone number.
- Stream videos instantly — playback begins while the file is still arriving.
- Seeks re-aim the download dynamically (the core feature).
- Retry with exponential backoff on network failures.
- Cache management (keeps last 3 videos, clear from Settings).

### Real-Time Updates via SideStore / AltStore / LiveContainer Source

You can add this repository directly to **SideStore**, **AltStore**, or **LiveContainer** to receive automated 1-click updates in real time whenever a new build is released!

[![Add to SideStore](https://img.shields.io/badge/SideStore-Add%20Source-blue?style=for-the-badge&logo=apple)](sidestore://source?url=https://raw.githubusercontent.com/NB6RULES/TeleStream/main/sources.json)
[![Add to AltStore](https://img.shields.io/badge/AltStore-Add%20Source-10B981?style=for-the-badge&logo=apple)](altstore://source?url=https://raw.githubusercontent.com/NB6RULES/TeleStream/main/sources.json)

**Source URL to add manually:**
\\\	ext
https://raw.githubusercontent.com/NB6RULES/TeleStream/main/sources.json
\\\

**How to add:**
1. Open **SideStore**, **AltStore**, or **LiveContainer**.
2. Go to the **Sources** tab.
3. Tap **+** (Add Source) and paste the URL above.
4. TeleStream will appear in your apps list with instant updates!

### Manual Installation (iOS)
1. Download TeleStream.ipa from the link above.
2. Install using one of these tools (no jailbreak required):
   - [LiveContainer](https://github.com/khanhduytran0/LiveContainer) — run unlimited apps without 3-app limit
   - [AltStore](https://altstore.io) — free sideloading
   - [SideStore](https://sidestore.io) — on-device sideloading
   - [Sideloadly](https://sideloadly.io) — PC/Mac installer

---

## 🛠 Building from Source

### Web App
\\\ash
cd web
npm install
npm run dev
\\\
*(Requires you to set \VITE_TELEGRAM_API_ID\ and \VITE_TELEGRAM_API_HASH\ in \web/.env\)*

### iOS App
This project uses [XcodeGen](https://github.com/yonaskolb/XcodeGen) and [TDLibKit](https://github.com/Swiftgram/TDLibKit).
1. Ensure Xcode is installed (macOS required).
2. Install XcodeGen: \rew install xcodegen\
3. Generate the project: \xcodegen generate\
4. Open \TeleStream.xcodeproj\ in Xcode and build.

---

## License

This project is licensed under the GPL-3.0 License. See the \LICENSE\ file for details.