/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ios: {
          bg: '#000000',
          elevated: '#0C0D11',
          surface: '#121317',
          card: '#1A1B1F',
          cardHover: '#23242A',
          input: '#1E1F23',
          border: '#292A2E',
          divider: '#343539',
          blue: '#007AFF',
          accent: '#ADC6FF',
          accentMuted: '#6B82B8',
          text: '#E3E2E7',
          secondary: '#C1C6D7',
          muted: '#8B90A0',
          danger: '#FFB4AB',
          dangerBg: '#410002',
          success: '#7DDC8A',
        },
        telegram: {
          blue: '#2AABEE',
          darkBlue: '#229ED9',
          bg: '#0F172A',
          card: '#1E293B',
          hover: '#334155',
          border: '#334155',
          accent: '#38BDF8'
        }
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
