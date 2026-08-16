import SwiftUI
import CoreImage.CIFilterBuiltins
import TDLibKit

struct LoginView: View {
    @EnvironmentObject var client: TelegramClient
    @State private var selectedTab = 0
    @State private var phoneNumber = ""
    @State private var verificationCode = ""
    @State private var password = ""
    @State private var firstName = ""
    @State private var lastName = ""

    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)

            ScrollView {
                VStack(spacing: 0) {
                    Spacer().frame(height: 50)

                    // Logo & App Name
                    Image("TeleStreamLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 80, height: 80)
                        .cornerRadius(18)
                        .padding(.bottom, 14)

                    Text("TeleStream")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.bottom, 6)

                    Text("Fast video streaming for Telegram")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "8B90A0"))
                        .padding(.bottom, 24)

                    // Error Banner
                    if let error = client.authError {
                        HStack(spacing: 10) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(Color(hex: "FFB4AB"))
                            Text(error)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(Color(hex: "FFB4AB"))
                                .multilineTextAlignment(.leading)
                            Spacer()
                            Button(action: { client.authError = nil }) {
                                Image(systemName: "xmark")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(Color(hex: "FFB4AB"))
                            }
                        }
                        .padding(14)
                        .background(Color(hex: "93000A").opacity(0.35))
                        .cornerRadius(12)
                        .padding(.horizontal, 24)
                        .padding(.bottom, 20)
                    }

                    // Dynamic State Views
                    if let state = client.authState {
                        switch state {
                        case .authorizationStateWaitPassword:
                            passwordView
                        case .authorizationStateWaitRegistration:
                            registrationView
                        case .authorizationStateWaitCode:
                            codeVerificationView
                        default:
                            initialAuthView
                        }
                    } else {
                        initialAuthView
                    }

                    Spacer().frame(height: 40)
                }
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            if selectedTab == 0 && client.qrCodeUrl == nil && !client.isProcessingAuth {
                Task { await client.startQRAuth() }
            }
        }
    }

    // MARK: - Initial Auth View (QR vs Phone Tab)

    private var initialAuthView: some View {
        VStack(spacing: 20) {
            segmentedControl
                .padding(.horizontal, 24)

            if selectedTab == 0 {
                qrCodeView
            } else {
                phoneLoginView
            }
        }
    }

    private var segmentedControl: some View {
        HStack(spacing: 0) {
            tabButton("QR Code", isSelected: selectedTab == 0) {
                selectedTab = 0
                Task { await client.startQRAuth() }
            }
            tabButton("Phone Number", isSelected: selectedTab == 1) {
                selectedTab = 1
            }
        }
        .padding(3)
        .background(Color(hex: "1E1F23"))
        .cornerRadius(12)
    }

    private func tabButton(_ title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 15, weight: isSelected ? .semibold : .medium))
                .foregroundColor(isSelected ? .white : Color(hex: "8B90A0"))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(isSelected ? Color(hex: "343539") : Color.clear)
                .cornerRadius(9)
        }
    }

    // MARK: - QR Code View

    private var qrCodeView: some View {
        VStack(spacing: 20) {
            ZStack {
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color(hex: "1E1F23"))
                    .frame(width: 250, height: 250)

                if let qrCode = client.qrCodeUrl {
                    Image(uiImage: generateQRCode(from: qrCode))
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 218, height: 218)
                        .padding(10)
                        .background(Color.white)
                        .cornerRadius(14)
                } else {
                    VStack(spacing: 12) {
                        ProgressView()
                            .scaleEffect(1.2)
                            .tint(Color(hex: "ADC6FF"))
                        Text("Generating QR Code...")
                            .font(.system(size: 13))
                            .foregroundColor(Color(hex: "8B90A0"))
                    }
                }
            }

            VStack(alignment: .leading, spacing: 10) {
                instructionRow("1", "Open Telegram on your phone")
                instructionRow("2", "Go to Settings > Devices")
                instructionRow("3", "Tap Link Desktop Device")
                instructionRow("4", "Point camera at the QR code above")
            }
            .padding(18)
            .background(Color(hex: "1E1F23"))
            .cornerRadius(14)
            .padding(.horizontal, 24)

            Button(action: {
                Task {
                    await client.startQRAuth()
                }
            }) {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.clockwise")
                    Text("Refresh QR Code")
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Color(hex: "ADC6FF"))
            }
            .padding(.top, 4)
        }
    }

    private func instructionRow(_ number: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Text(number)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(Color(hex: "ADC6FF"))
                .frame(width: 20, height: 20)
                .background(Color(hex: "ADC6FF").opacity(0.15))
                .clipShape(Circle())
            Text(text)
                .font(.system(size: 14))
                .foregroundColor(Color(hex: "C1C6D7"))
            Spacer()
        }
    }

    // MARK: - Phone Login View

    private var phoneLoginView: some View {
        VStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Phone Number")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color(hex: "C1C6D7"))
                    .padding(.horizontal, 24)

                HStack(spacing: 10) {
                    Image(systemName: "phone.fill")
                        .foregroundColor(Color(hex: "8B90A0"))
                        .font(.system(size: 16))

                    TextField("", text: $phoneNumber, prompt: Text("+1 234 567 8900").foregroundColor(Color(hex: "8B90A0")))
                        .font(.system(size: 17))
                        .foregroundColor(.white)
                        .keyboardType(.phonePad)
                }
                .padding(14)
                .background(Color(hex: "1E1F23"))
                .cornerRadius(12)
                .padding(.horizontal, 24)
            }

            Text("Enter your full phone number including your country code (e.g. +1 for US, +44 for UK, +91 for India).")
                .font(.system(size: 13))
                .foregroundColor(Color(hex: "8B90A0"))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Button(action: {
                Task {
                    await client.sendPhoneNumber(phoneNumber)
                }
            }) {
                HStack(spacing: 8) {
                    if client.isProcessingAuth {
                        ProgressView()
                            .tint(.white)
                    }
                    Text("Send Code")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(phoneNumber.trimmingCharacters(in: .whitespaces).isEmpty ? Color(hex: "343539") : Color(hex: "007AFF"))
                .cornerRadius(25)
            }
            .disabled(phoneNumber.trimmingCharacters(in: .whitespaces).isEmpty || client.isProcessingAuth)
            .padding(.horizontal, 24)
            .padding(.top, 6)
        }
    }

    // MARK: - Code Verification View

    private var codeVerificationView: some View {
        VStack(spacing: 20) {
            Image(systemName: "envelope.badge.fill")
                .font(.system(size: 40))
                .foregroundColor(Color(hex: "ADC6FF"))
                .padding(.bottom, 4)

            VStack(spacing: 6) {
                Text("Enter Verification Code")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)

                Text("We've sent a code to your Telegram app or SMS for")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "8B90A0"))

                Text(phoneNumber.isEmpty ? "your phone" : phoneNumber)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color(hex: "ADC6FF"))
            }

            TextField("", text: $verificationCode, prompt: Text("• • • • •").foregroundColor(Color(hex: "8B90A0")))
                .font(.system(size: 28, weight: .bold, design: .monospaced))
                .foregroundColor(.white)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .padding(16)
                .background(Color(hex: "1E1F23"))
                .cornerRadius(14)
                .padding(.horizontal, 60)

            Button(action: {
                Task {
                    await client.sendAuthCode(verificationCode)
                }
            }) {
                HStack(spacing: 8) {
                    if client.isProcessingAuth {
                        ProgressView()
                            .tint(.white)
                    }
                    Text("Verify")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(verificationCode.trimmingCharacters(in: .whitespaces).isEmpty ? Color(hex: "343539") : Color(hex: "007AFF"))
                .cornerRadius(25)
            }
            .disabled(verificationCode.trimmingCharacters(in: .whitespaces).isEmpty || client.isProcessingAuth)
            .padding(.horizontal, 24)

            HStack(spacing: 20) {
                Button(action: {
                    Task { await client.resendCode() }
                }) {
                    Text("Resend Code")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(Color(hex: "ADC6FF"))
                }

                Text("•")
                    .foregroundColor(Color(hex: "8B90A0"))

                Button(action: {
                    verificationCode = ""
                    client.recreateClient()
                }) {
                    Text("Change Number")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(Color(hex: "8B90A0"))
                }
            }
            .padding(.top, 8)
        }
        .padding(.horizontal, 20)
    }

    // MARK: - 2FA Password View

    private var passwordView: some View {
        VStack(spacing: 20) {
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 44))
                .foregroundColor(Color(hex: "ADC6FF"))
                .padding(.bottom, 4)

            VStack(spacing: 6) {
                Text("Two-Step Verification")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.white)

                Text("Your Telegram account is protected with a cloud password.")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "8B90A0"))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            if let hint = client.passwordHint, !hint.isEmpty {
                HStack(spacing: 6) {
                    Image(systemName: "lightbulb.fill")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "ADC6FF"))
                    Text("Hint: \(hint)")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(Color(hex: "ADC6FF"))
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(Color(hex: "ADC6FF").opacity(0.15))
                .cornerRadius(16)
            }

            SecureField("", text: $password, prompt: Text("Enter 2FA Password").foregroundColor(Color(hex: "8B90A0")))
                .font(.system(size: 17))
                .foregroundColor(.white)
                .padding(14)
                .background(Color(hex: "1E1F23"))
                .cornerRadius(12)
                .padding(.horizontal, 24)

            Button(action: {
                Task {
                    await client.sendPassword(password)
                }
            }) {
                HStack(spacing: 8) {
                    if client.isProcessingAuth {
                        ProgressView()
                            .tint(.white)
                    }
                    Text("Submit Password")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(password.isEmpty ? Color(hex: "343539") : Color(hex: "007AFF"))
                .cornerRadius(25)
            }
            .disabled(password.isEmpty || client.isProcessingAuth)
            .padding(.horizontal, 24)

            Button(action: {
                password = ""
                client.recreateClient()
            }) {
                Text("Cancel & Start Over")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Color(hex: "8B90A0"))
            }
            .padding(.top, 8)
        }
        .padding(.horizontal, 20)
    }

    // MARK: - Registration View

    private var registrationView: some View {
        VStack(spacing: 20) {
            Image(systemName: "person.crop.circle.badge.plus")
                .font(.system(size: 44))
                .foregroundColor(Color(hex: "ADC6FF"))
                .padding(.bottom, 4)

            VStack(spacing: 6) {
                Text("Complete Profile")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.white)

                Text("Enter your name to finish setting up your account.")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "8B90A0"))
            }

            VStack(spacing: 12) {
                TextField("", text: $firstName, prompt: Text("First Name").foregroundColor(Color(hex: "8B90A0")))
                    .font(.system(size: 17))
                    .foregroundColor(.white)
                    .padding(14)
                    .background(Color(hex: "1E1F23"))
                    .cornerRadius(12)

                TextField("", text: $lastName, prompt: Text("Last Name (Optional)").foregroundColor(Color(hex: "8B90A0")))
                    .font(.system(size: 17))
                    .foregroundColor(.white)
                    .padding(14)
                    .background(Color(hex: "1E1F23"))
                    .cornerRadius(12)
            }
            .padding(.horizontal, 24)

            Button(action: {
                Task {
                    await client.registerUser(firstName: firstName, lastName: lastName)
                }
            }) {
                HStack(spacing: 8) {
                    if client.isProcessingAuth {
                        ProgressView()
                            .tint(.white)
                    }
                    Text("Finish Setup")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(firstName.trimmingCharacters(in: .whitespaces).isEmpty ? Color(hex: "343539") : Color(hex: "007AFF"))
                .cornerRadius(25)
            }
            .disabled(firstName.trimmingCharacters(in: .whitespaces).isEmpty || client.isProcessingAuth)
            .padding(.horizontal, 24)
        }
        .padding(.horizontal, 20)
    }

    // MARK: - QR Code Generator

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
