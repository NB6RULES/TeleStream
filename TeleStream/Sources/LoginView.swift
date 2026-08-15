import SwiftUI
import CoreImage.CIFilterBuiltins

struct LoginView: View {
    @EnvironmentObject var client: TelegramClient
    @State private var selectedTab = 0
    @State private var phoneNumber = ""
    @State private var verificationCode = ""
    @State private var awaitingCode = false

    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)

            ScrollView {
                VStack(spacing: 0) {
                    Spacer().frame(height: 60)

                    Image(systemName: "paperplane.fill")
                        .font(.system(size: 40))
                        .foregroundColor(Color(hex: "ADC6FF"))
                        .frame(width: 80, height: 80)
                        .background(Color(hex: "1C1C1E"))
                        .cornerRadius(18)
                        .padding(.bottom, 16)

                    Text("Log in to TeleStream")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.bottom, 24)

                    if let error = client.authError {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(Color(hex: "FFB4AB"))
                            Text(error)
                                .font(.system(size: 15))
                                .foregroundColor(Color(hex: "FFB4AB"))
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(hex: "93000A").opacity(0.2))
                        .cornerRadius(12)
                        .padding(.horizontal, 24)
                        .padding(.bottom, 16)
                    }

                    segmentedControl
                        .padding(.horizontal, 24)
                        .padding(.bottom, 24)

                    if selectedTab == 0 {
                        qrCodeView
                    } else {
                        phoneLoginView
                    }

                    Spacer()
                }
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            if selectedTab == 0 {
                Task { await client.startQRAuth() }
            }
        }
    }

    private var segmentedControl: some View {
        HStack(spacing: 0) {
            tabButton("QR Code", isSelected: selectedTab == 0) {
                selectedTab = 0
                awaitingCode = false
                Task { await client.startQRAuth() }
            }
            tabButton("Phone Number", isSelected: selectedTab == 1) {
                selectedTab = 1
            }
        }
        .padding(2)
        .background(Color(hex: "1C1C1E"))
        .cornerRadius(10)
    }

    private func tabButton(_ title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 15, weight: isSelected ? .semibold : .medium))
                .foregroundColor(isSelected ? .white : Color(hex: "8E8E93"))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(isSelected ? Color(hex: "3A3A3C") : Color.clear)
                .cornerRadius(8)
        }
    }

    private var qrCodeView: some View {
        VStack(spacing: 24) {
            if let qrCode = client.qrCodeUrl {
                Image(uiImage: generateQRCode(from: qrCode))
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 220, height: 220)
                    .padding(16)
                    .background(Color.white)
                    .cornerRadius(24)
            } else {
                ZStack {
                    RoundedRectangle(cornerRadius: 24)
                        .fill(Color(hex: "1C1C1E"))
                        .frame(width: 252, height: 252)
                    ProgressView()
                        .scaleEffect(1.2)
                        .tint(Color(hex: "ADC6FF"))
                }
            }

            VStack(alignment: .leading, spacing: 12) {
                instructionRow("1", "Open Telegram on your phone")
                instructionRow("2", "Go to Settings > Devices")
                instructionRow("3", "Tap Link Desktop Device")
                instructionRow("4", "Point your camera at this screen")
            }
            .padding(20)
            .background(Color(hex: "1C1C1E"))
            .cornerRadius(16)
            .padding(.horizontal, 24)
        }
    }

    private func instructionRow(_ number: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number).")
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.white)
                .frame(width: 20)
            Text(text)
                .font(.system(size: 15))
                .foregroundColor(Color(hex: "AEAEB2"))
        }
    }

    private var phoneLoginView: some View {
        VStack(spacing: 16) {
            if !awaitingCode {
                VStack(spacing: 0) {
                    TextField("", text: $phoneNumber, prompt: Text("+1 Phone Number").foregroundColor(Color(hex: "8E8E93")))
                        .font(.system(size: 17))
                        .foregroundColor(.white)
                        .keyboardType(.phonePad)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(Color(hex: "1C1C1E"))
                }
                .cornerRadius(12)
                .padding(.horizontal, 24)

                Text("Please confirm your country code and enter your phone number.")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "8E8E93"))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)

                Button(action: {
                    Task {
                        await client.sendPhoneNumber(phoneNumber)
                        if client.authError == nil {
                            awaitingCode = true
                        }
                    }
                }) {
                    Text("Next")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color(hex: "007AFF"))
                        .cornerRadius(25)
                }
                .disabled(phoneNumber.isEmpty)
                .opacity(phoneNumber.isEmpty ? 0.5 : 1)
                .padding(.horizontal, 24)
                .padding(.top, 8)
            } else {
                VStack(spacing: 16) {
                    Text("We've sent a code to the Telegram app for")
                        .font(.system(size: 15))
                        .foregroundColor(Color(hex: "AEAEB2"))
                    Text(phoneNumber)
                        .font(.system(size: 17, weight: .medium))
                        .foregroundColor(.white)

                    TextField("", text: $verificationCode, prompt: Text("Enter code").foregroundColor(Color(hex: "8E8E93")))
                        .font(.system(size: 24, weight: .medium))
                        .foregroundColor(.white)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.center)
                        .padding(16)
                        .background(Color(hex: "1C1C1E"))
                        .cornerRadius(12)
                        .padding(.horizontal, 60)

                    Button(action: {
                        Task { await client.sendAuthCode(verificationCode) }
                    }) {
                        Text("Verify")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color(hex: "007AFF"))
                            .cornerRadius(25)
                    }
                    .disabled(verificationCode.isEmpty)
                    .opacity(verificationCode.isEmpty ? 0.5 : 1)
                    .padding(.horizontal, 24)
                }
            }
        }
    }

    func generateQRCode(from string: String) -> UIImage {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        if let outputImage = filter.outputImage {
            let scaledImage = outputImage.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
            if let cgimg = context.createCGImage(scaledImage, from: scaledImage.extent) {
                return UIImage(cgImage: cgimg)
            }
        }
        return UIImage(systemName: "xmark.circle") ?? UIImage()
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}
