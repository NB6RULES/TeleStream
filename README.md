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

**[Download Latest IPA](../../releases/tag/latest)**

### Real-Time Updates via LiveContainer / SideStore / AltStore Source

You can add this repository directly to **LiveContainer**, **SideStore**, or **AltStore** to receive automated 1-click updates in real time whenever a new build is released!

**Source URL to add:**
```text
https://raw.githubusercontent.com/NB6RULES/TeleStream/main/sources.json
```

**How to add:**
1. Open **LiveContainer** (or SideStore / AltStore).
2. Go to the **Sources** tab.
3. Tap **+** (Add Source) and paste the URL above:
   `https://raw.githubusercontent.com/NB6RULES/TeleStream/main/sources.json`
4. TeleStream will now appear in your apps list, with instant update notifications whenever code is pushed!

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
