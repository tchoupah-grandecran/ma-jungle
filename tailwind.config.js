/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ], 
  theme: {
    extend: {
      colors: {
        jungle: {
          // Un vert encore plus profond pour le fond du mode sombre
          deep: '#1A241E', 
          green: '#323D36',
          sage: '#8A9A5B',
          cream: '#F9F7F2',
          terracotta: '#BF6B4E',
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        rounded: ['RoundyRainbows', 'sans-serif'],
      },
    },
  },
  plugins: [],
}