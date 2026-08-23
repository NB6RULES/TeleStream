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
