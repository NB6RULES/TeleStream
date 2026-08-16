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
    }

    // MARK: - Initial Auth View (Phone vs QR Tab)

    private var initialAuthView: some View {
        VStack(spacing: 20) {
            segmentedControl
                .padding(.horizontal, 24)

            if selectedTab == 0 {
                phoneLoginView
            } else {
                qrCodeView
            }
        }
    }

    private var segmentedControl: some View {
        HStack(spacing: 0) {
            tabButton("Phone Number", isSelected: selectedTab == 0) {
                selectedTab = 0
                client.resetToPhoneAuth()
            }
            tabButton("QR Code", isSelected: selectedTab == 1) {
                selectedTab = 1
                Task { await client.startQRAuth() }
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
                    client.qrCodeUrl = nil
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

    @State private var selectedCountry: Country = Country.defaultCountry
    @State private var showCountryPicker = false

    // MARK: - Phone Login View

    private var phoneLoginView: some View {
        VStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Country / Region")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color(hex: "C1C6D7"))
                    .padding(.horizontal, 24)

                // Country Selector Button
                Button(action: { showCountryPicker = true }) {
                    HStack(spacing: 12) {
                        Text(selectedCountry.flag)
                            .font(.system(size: 24))

                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(selectedCountry.name) (\(selectedCountry.iso))")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.white)
                                .lineLimit(1)
                        }

                        Spacer()

                        Text(selectedCountry.dialCode)
                            .font(.system(size: 15, weight: .semibold, design: .monospaced))
                            .foregroundColor(Color(hex: "ADC6FF"))

                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Color(hex: "8B90A0"))
                    }
                    .padding(14)
                    .background(Color(hex: "1E1F23"))
                    .cornerRadius(12)
                }
                .padding(.horizontal, 24)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Phone Number")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color(hex: "C1C6D7"))
                    .padding(.horizontal, 24)

                HStack(spacing: 10) {
                    Text(selectedCountry.dialCode)
                        .font(.system(size: 16, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(hex: "ADC6FF"))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(hex: "ADC6FF").opacity(0.15))
                        .cornerRadius(6)

                    TextField("", text: $phoneNumber, prompt: Text("Phone Number").foregroundColor(Color(hex: "8B90A0")))
                        .font(.system(size: 17))
                        .foregroundColor(.white)
                        .keyboardType(.phonePad)
                }
                .padding(14)
                .background(Color(hex: "1E1F23"))
                .cornerRadius(12)
                .padding(.horizontal, 24)
            }

            Text("Telegram will send a confirmation code to your Telegram app.")
                .font(.system(size: 13))
                .foregroundColor(Color(hex: "8B90A0"))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Button(action: {
                Task {
                    let countryDigits = selectedCountry.dialCode.filter { "0123456789".contains($0) }
                    var userDigits = phoneNumber.filter { "0123456789".contains($0) }
                    if userDigits.hasPrefix(countryDigits) {
                        userDigits = String(userDigits.dropFirst(countryDigits.count))
                    }
                    if userDigits.hasPrefix("0") {
                        userDigits = String(userDigits.dropFirst())
                    }
                    let fullNumber = "+\(countryDigits)\(userDigits)"
                    await client.sendPhoneNumber(fullNumber)
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
        .sheet(isPresented: $showCountryPicker) {
            CountryPickerSheet(selectedCountry: $selectedCountry)
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

                Text("Telegram sent a 5-digit code to your Telegram app (or SMS) for")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "8B90A0"))
                    .multilineTextAlignment(.center)

                Text(phoneNumber.isEmpty ? "your phone" : "\(selectedCountry.dialCode) \(phoneNumber)")
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
                    client.resetToPhoneAuth()
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
                client.authState = .authorizationStateWaitPhoneNumber
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

// MARK: - Country Model & Picker Sheet

struct Country: Identifiable, Hashable {
    var id: String { iso }
    let name: String
    let dialCode: String
    let flag: String
    let iso: String

    static let defaultCountry = Country(name: "India", dialCode: "+91", flag: "🇮🇳", iso: "IN")

    static let allCountries: [Country] = [
        Country(name: "Afghanistan", dialCode: "+93", flag: "🇦🇫", iso: "AF"),
        Country(name: "Albania", dialCode: "+355", flag: "🇦🇱", iso: "AL"),
        Country(name: "Algeria", dialCode: "+213", flag: "🇩🇿", iso: "DZ"),
        Country(name: "Argentina", dialCode: "+54", flag: "🇦🇷", iso: "AR"),
        Country(name: "Armenia", dialCode: "+374", flag: "🇦🇲", iso: "AM"),
        Country(name: "Australia", dialCode: "+61", flag: "🇦🇺", iso: "AU"),
        Country(name: "Austria", dialCode: "+43", flag: "🇦🇹", iso: "AT"),
        Country(name: "Azerbaijan", dialCode: "+994", flag: "🇦🇿", iso: "AZ"),
        Country(name: "Bahrain", dialCode: "+973", flag: "🇧🇭", iso: "BH"),
        Country(name: "Bangladesh", dialCode: "+880", flag: "🇧🇩", iso: "BD"),
        Country(name: "Belarus", dialCode: "+375", flag: "🇧🇾", iso: "BY"),
        Country(name: "Belgium", dialCode: "+32", flag: "🇧🇪", iso: "BE"),
        Country(name: "Brazil", dialCode: "+55", flag: "🇧🇷", iso: "BR"),
        Country(name: "Bulgaria", dialCode: "+359", flag: "🇧🇬", iso: "BG"),
        Country(name: "Canada", dialCode: "+1", flag: "🇨🇦", iso: "CA"),
        Country(name: "Chile", dialCode: "+56", flag: "🇨🇱", iso: "CL"),
        Country(name: "China", dialCode: "+86", flag: "🇨🇳", iso: "CN"),
        Country(name: "Colombia", dialCode: "+57", flag: "🇨🇴", iso: "CO"),
        Country(name: "Croatia", dialCode: "+385", flag: "🇭🇷", iso: "HR"),
        Country(name: "Cyprus", dialCode: "+357", flag: "🇨🇾", iso: "CY"),
        Country(name: "Czech Republic", dialCode: "+420", flag: "🇨🇿", iso: "CZ"),
        Country(name: "Denmark", dialCode: "+45", flag: "🇩🇰", iso: "DK"),
        Country(name: "Egypt", dialCode: "+20", flag: "🇪🇬", iso: "EG"),
        Country(name: "Estonia", dialCode: "+372", flag: "🇪🇪", iso: "EE"),
        Country(name: "Finland", dialCode: "+358", flag: "🇫🇮", iso: "FI"),
        Country(name: "France", dialCode: "+33", flag: "🇫🇷", iso: "FR"),
        Country(name: "Georgia", dialCode: "+995", flag: "🇬🇪", iso: "GE"),
        Country(name: "Germany", dialCode: "+49", flag: "🇩🇪", iso: "DE"),
        Country(name: "Greece", dialCode: "+30", flag: "🇬🇷", iso: "GR"),
        Country(name: "Hong Kong", dialCode: "+852", flag: "🇭🇰", iso: "HK"),
        Country(name: "Hungary", dialCode: "+36", flag: "🇭🇺", iso: "HU"),
        Country(name: "Iceland", dialCode: "+354", flag: "🇮🇸", iso: "IS"),
        Country(name: "India", dialCode: "+91", flag: "🇮🇳", iso: "IN"),
        Country(name: "Indonesia", dialCode: "+62", flag: "🇮🇩", iso: "ID"),
        Country(name: "Iran", dialCode: "+98", flag: "🇮🇷", iso: "IR"),
        Country(name: "Iraq", dialCode: "+964", flag: "🇮🇶", iso: "IQ"),
        Country(name: "Ireland", dialCode: "+353", flag: "🇮🇪", iso: "IE"),
        Country(name: "Israel", dialCode: "+972", flag: "🇮🇱", iso: "IL"),
        Country(name: "Italy", dialCode: "+39", flag: "🇮🇹", iso: "IT"),
        Country(name: "Japan", dialCode: "+81", flag: "🇯🇵", iso: "JP"),
        Country(name: "Jordan", dialCode: "+962", flag: "🇯🇴", iso: "JO"),
        Country(name: "Kazakhstan", dialCode: "+7", flag: "🇰🇿", iso: "KZ"),
        Country(name: "Kuwait", dialCode: "+965", flag: "🇰🇼", iso: "KW"),
        Country(name: "Latvia", dialCode: "+371", flag: "🇱🇻", iso: "LV"),
        Country(name: "Lebanon", dialCode: "+961", flag: "🇱🇧", iso: "LB"),
        Country(name: "Lithuania", dialCode: "+370", flag: "🇱🇹", iso: "LT"),
        Country(name: "Malaysia", dialCode: "+60", flag: "🇲🇾", iso: "MY"),
        Country(name: "Mexico", dialCode: "+52", flag: "🇲🇽", iso: "MX"),
        Country(name: "Morocco", dialCode: "+212", flag: "🇲🇦", iso: "MA"),
        Country(name: "Nepal", dialCode: "+977", flag: "🇳🇵", iso: "NP"),
        Country(name: "Netherlands", dialCode: "+31", flag: "🇳🇱", iso: "NL"),
        Country(name: "New Zealand", dialCode: "+64", flag: "🇳🇿", iso: "NZ"),
        Country(name: "Nigeria", dialCode: "+234", flag: "🇳🇬", iso: "NG"),
        Country(name: "Norway", dialCode: "+47", flag: "🇳🇴", iso: "NO"),
        Country(name: "Oman", dialCode: "+968", flag: "🇴🇲", iso: "OM"),
        Country(name: "Pakistan", dialCode: "+92", flag: "🇵🇰", iso: "PK"),
        Country(name: "Philippines", dialCode: "+63", flag: "🇵🇭", iso: "PH"),
        Country(name: "Poland", dialCode: "+48", flag: "🇵🇱", iso: "PL"),
        Country(name: "Portugal", dialCode: "+351", flag: "🇵🇹", iso: "PT"),
        Country(name: "Qatar", dialCode: "+974", flag: "🇶🇦", iso: "QA"),
        Country(name: "Romania", dialCode: "+40", flag: "🇷🇴", iso: "RO"),
        Country(name: "Russia", dialCode: "+7", flag: "🇷🇺", iso: "RU"),
        Country(name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦", iso: "SA"),
        Country(name: "Serbia", dialCode: "+381", flag: "🇷🇸", iso: "RS"),
        Country(name: "Singapore", dialCode: "+65", flag: "🇸🇬", iso: "SG"),
        Country(name: "Slovakia", dialCode: "+421", flag: "🇸🇰", iso: "SK"),
        Country(name: "South Africa", dialCode: "+27", flag: "🇿🇦", iso: "ZA"),
        Country(name: "South Korea", dialCode: "+82", flag: "🇰🇷", iso: "KR"),
        Country(name: "Spain", dialCode: "+34", flag: "🇪🇸", iso: "ES"),
        Country(name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰", iso: "LK"),
        Country(name: "Sweden", dialCode: "+46", flag: "🇸🇪", iso: "SE"),
        Country(name: "Switzerland", dialCode: "+41", flag: "🇨🇭", iso: "CH"),
        Country(name: "Taiwan", dialCode: "+886", flag: "🇹🇼", iso: "TW"),
        Country(name: "Thailand", dialCode: "+66", flag: "🇹🇭", iso: "TH"),
        Country(name: "Turkey", dialCode: "+90", flag: "🇹🇷", iso: "TR"),
        Country(name: "Ukraine", dialCode: "+380", flag: "🇺🇦", iso: "UA"),
        Country(name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪", iso: "AE"),
        Country(name: "United Kingdom", dialCode: "+44", flag: "🇬🇧", iso: "GB"),
        Country(name: "United States", dialCode: "+1", flag: "🇺🇸", iso: "US"),
        Country(name: "Uzbekistan", dialCode: "+998", flag: "🇺🇿", iso: "UZ"),
        Country(name: "Vietnam", dialCode: "+84", flag: "🇻🇳", iso: "VN")
    ].sorted(by: { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending })
}

struct CountryPickerSheet: View {
    @Binding var selectedCountry: Country
    @Environment(\.dismiss) var dismiss
    @State private var search = ""

    private var filteredCountries: [Country] {
        if search.trimmingCharacters(in: .whitespaces).isEmpty {
            return Country.allCountries
        }
        let q = search.lowercased().trimmingCharacters(in: .whitespaces)
        return Country.allCountries.filter {
            $0.name.lowercased().contains(q) ||
            $0.dialCode.contains(q) ||
            $0.iso.lowercased().contains(q)
        }
    }

    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 12) {
                    // Search bar
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(Color(hex: "8B90A0"))
                            .font(.system(size: 16))
                        TextField("", text: $search, prompt: Text("Search country, ISO or dial code...").foregroundColor(Color(hex: "8B90A0")))
                            .font(.system(size: 16))
                            .foregroundColor(.white)
                        if !search.isEmpty {
                            Button(action: { search = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(Color(hex: "8B90A0"))
                            }
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color(hex: "1E1F23"))
                    .cornerRadius(10)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)

                    List {
                        ForEach(filteredCountries) { country in
                            Button(action: {
                                selectedCountry = country
                                dismiss()
                            }) {
                                HStack(spacing: 12) {
                                    Text(country.flag)
                                        .font(.system(size: 24))

                                    Text(country.name)
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundColor(.white)

                                    Text("(\(country.iso))")
                                        .font(.system(size: 13))
                                        .foregroundColor(Color(hex: "8B90A0"))

                                    Spacer()

                                    Text(country.dialCode)
                                        .font(.system(size: 15, weight: .semibold, design: .monospaced))
                                        .foregroundColor(Color(hex: "ADC6FF"))

                                    if selectedCountry.iso == country.iso {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(Color(hex: "007AFF"))
                                            .padding(.leading, 6)
                                    }
                                }
                                .padding(.vertical, 4)
                            }
                            .listRowBackground(Color(hex: "121317"))
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Select Country")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(Color(hex: "ADC6FF"))
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
