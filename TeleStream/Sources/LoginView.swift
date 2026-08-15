import SwiftUI
import CoreImage.CIFilterBuiltins

struct LoginView: View {
    @EnvironmentObject var client: TelegramClient
    @State private var showPhoneLogin = false
    @State private var phoneNumber = ""
    @State private var verificationCode = ""
    @State private var awaitingCode = false

    var body: some View {
        VStack(spacing: 24) {
            Text("Log in to Telegram")
                .font(.largeTitle)
                .bold()

            if let error = client.authError {
                Text(error)
                    .foregroundColor(.red)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            if showPhoneLogin {
                phoneLoginView
            } else {
                qrLoginView
            }

            Button(showPhoneLogin ? "Use QR Code instead" : "Use Phone Number instead") {
                showPhoneLogin.toggle()
                awaitingCode = false
                if !showPhoneLogin {
                    Task { await client.startQRAuth() }
                }
            }
            .padding(.top)
        }
        .padding()
        .onAppear {
            if !showPhoneLogin {
                Task { await client.startQRAuth() }
            }
        }
    }

    // MARK: - QR Code Login

    private var qrLoginView: some View {
        VStack(spacing: 16) {
            Text("1. Open Telegram on your phone\n2. Go to Settings → Devices → Link Desktop Device\n3. Point your phone at this screen")
                .multilineTextAlignment(.center)

            if let qrCode = client.qrCodeUrl {
                Image(uiImage: generateQRCode(from: qrCode))
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 250, height: 250)
            } else {
                ProgressView("Waiting for QR code...")
                    .frame(width: 250, height: 250)
            }
        }
    }

    // MARK: - Phone Number Login

    private var phoneLoginView: some View {
        VStack(spacing: 16) {
            if !awaitingCode {
                Text("Enter your phone number with country code")
                    .multilineTextAlignment(.center)

                TextField("+1234567890", text: $phoneNumber)
                    .keyboardType(.phonePad)
                    .textFieldStyle(.roundedBorder)
                    .padding(.horizontal, 40)

                Button("Send Code") {
                    Task {
                        await client.sendPhoneNumber(phoneNumber)
                        if client.authError == nil {
                            awaitingCode = true
                        }
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(phoneNumber.isEmpty)
            } else {
                Text("Enter the code sent to your Telegram app")
                    .multilineTextAlignment(.center)

                TextField("12345", text: $verificationCode)
                    .keyboardType(.numberPad)
                    .textFieldStyle(.roundedBorder)
                    .padding(.horizontal, 40)

                Button("Verify") {
                    Task {
                        await client.sendAuthCode(verificationCode)
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(verificationCode.isEmpty)
            }
        }
    }

    // MARK: - QR Code Generator

    func generateQRCode(from string: String) -> UIImage {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)

        if let outputImage = filter.outputImage {
            let transform = CGAffineTransform(scaleX: 10, y: 10)
            let scaledImage = outputImage.transformed(by: transform)
            if let cgimg = context.createCGImage(scaledImage, from: scaledImage.extent) {
                return UIImage(cgImage: cgimg)
            }
        }
        return UIImage(systemName: "xmark.circle") ?? UIImage()
    }
}
