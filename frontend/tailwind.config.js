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
        'brand-dark':    '#3B2F23', // deep earthy brown
        'brand-light':   '#F5F5F5',
        'brand-brown':   '#7C4F2A', // rich brown
        'brand-tan':     '#E9D8C3', // subtle tan
        'accent-deep':   '#4B3A2F', // dark accent brown
        'accent-xlight': 'rgba(255,255,255,0.08)',
        'accent-tan':    '#F6E7D7', // lighter tan accent
        'accent-black':  '#181818',
        'accent-white':  '#FFFFFF',
      },
      fontFamily: {
        sans:       ['Inter', 'sans-serif'],
        futuristic: ['Orbitron', 'sans-serif']
      },
      backgroundImage: {
        'dark-gradient': 'linear-gradient(135deg, #3B2F23 0%, #7C4F2A 100%)',
        'tan-gradient': 'linear-gradient(135deg, #E9D8C3 0%, #F6E7D7 100%)',
      }
    },
  },
  plugins: [],
};
