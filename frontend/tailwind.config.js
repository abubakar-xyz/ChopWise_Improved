/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        'neon-teal': '#00ffc2',
        'dark-bg': '#0a0a0d',
        'glass-white': 'rgba(255,255,255,0.1)',
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
        futuristic: ['"Orbitron"', 'sans-serif']
      }
    },
  },
  plugins: [],
};
