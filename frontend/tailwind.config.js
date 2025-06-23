/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        'brand-green':   '#008752',
        'brand-dark':    '#0A0F1A',
        'brand-light':   '#F5F5F5',
        'accent-deep':   '#292E49',
        'accent-xlight':'rgba(255,255,255,0.05)'
      },
      fontFamily: {
        sans:       ['Inter', 'sans-serif'],
        futuristic: ['Orbitron', 'sans-serif']
      },
      backgroundImage: {
        'dark-gradient': 'linear-gradient(135deg, #0A0F1A 0%, #1F2A44 100%)'
      }
    },
  },
  plugins: [],
};
