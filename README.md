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

### How to install on iPhone

1. Download `TeleStream.ipa` from the link above
2. Install using one of these tools (no jailbreak required):
   - [AltStore](https://altstore.io) — free, re-sign every 7 days
   - [Sideloadly](https://sideloadly.io) — free, re-sign every 7 days
   - [LiveContainer](https://github.com/khanhduytran0/LiveContainer) — no re-signing needed
3. Open TeleStream and log in with QR code or your phone number
4. Browse your chats and stream videos

> **Note:** With a free Apple ID, sideloaded apps expire after 7 days and need re-installing. A paid Apple Developer account ($99/year) extends this to 1 year.

## Building from source

This project uses [XcodeGen](https://github.com/yonaskolb/XcodeGen) and [TDLibKit](https://github.com/Swiftgram/TDLibKit).

1. Ensure Xcode is installed (macOS required).
2. Install XcodeGen: `brew install xcodegen`
3. Generate the project: `xcodegen generate`
4. Open `TeleStream.xcodeproj` in Xcode and build.

Or just push to GitHub — the CI workflow builds and publishes the IPA automatically.

## License

This project is licensed under the GPL-3.0 License. See the `LICENSE` file for details.
