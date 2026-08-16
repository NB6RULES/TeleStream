# TeleStream

A Telegram video streaming client for iOS. Stream videos from your Telegram chats instantly without waiting for full downloads.

*Disclaimer: This is an unofficial third-party client and is not affiliated with Telegram.*

## Features

- Sign in via Telegram QR code or phone number
- Browse your Telegram chats and channels
- Stream videos instantly — playback begins while the file is still arriving
- Seeks re-aim the download dynamically (the core feature)
- Retry with exponential backoff on network failures
- Cache management (keeps last 3 videos, clear from Settings)
- Logout clears all data

## Download & Install

The latest IPA is automatically built and published on every commit:

- 🚀 **[Direct Download: TeleStream.ipa](https://github.com/NB6RULES/TeleStream/releases/latest/download/TeleStream.ipa)**
- 📦 **[View All Releases & Changelog](https://github.com/NB6RULES/TeleStream/releases/latest)**

### Real-Time Updates via SideStore / AltStore / LiveContainer Source

You can add this repository directly to **SideStore**, **AltStore**, or **LiveContainer** to receive automated 1-click updates in real time whenever a new build is released!

[![Add to SideStore](https://img.shields.io/badge/SideStore-Add%20Source-blue?style=for-the-badge&logo=apple)](sidestore://source?url=https://raw.githubusercontent.com/NB6RULES/TeleStream/main/sources.json)
[![Add to AltStore](https://img.shields.io/badge/AltStore-Add%20Source-10B981?style=for-the-badge&logo=apple)](altstore://source?url=https://raw.githubusercontent.com/NB6RULES/TeleStream/main/sources.json)

**Source URL to add manually:**
```text
https://raw.githubusercontent.com/NB6RULES/TeleStream/main/sources.json
```

**How to add:**
1. Open **SideStore**, **AltStore**, or **LiveContainer**.
2. Go to the **Sources** tab.
3. Tap **+** (Add Source) and paste:
   `https://raw.githubusercontent.com/NB6RULES/TeleStream/main/sources.json`
4. TeleStream will appear in your apps list with instant updates whenever a new version is built!

### Manual Installation

1. Download `TeleStream.ipa` from the link above
2. Install using one of these tools (no jailbreak required):
   - [LiveContainer](https://github.com/khanhduytran0/LiveContainer) — run unlimited apps without 3-app limit
   - [AltStore](https://altstore.io) — free sideloading
   - [SideStore](https://sidestore.io) — on-device sideloading
   - [Sideloadly](https://sideloadly.io) — PC/Mac installer
3. Open TeleStream and log in with QR code or your phone number
4. Browse your chats and stream audio/video

## Building from source

This project uses [XcodeGen](https://github.com/yonaskolb/XcodeGen) and [TDLibKit](https://github.com/Swiftgram/TDLibKit).

1. Ensure Xcode is installed (macOS required).
2. Install XcodeGen: `brew install xcodegen`
3. Generate the project: `xcodegen generate`
4. Open `TeleStream.xcodeproj` in Xcode and build.

Or just push to GitHub — the CI workflow builds and publishes the IPA automatically.

## License

This project is licensed under the GPL-3.0 License. See the `LICENSE` file for details.
