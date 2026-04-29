/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jungle: {
          green: '#323D36',
          sage: '#8A9A5B',
          cream: '#F9F7F2',
          terracotta: '#BF6B4E',
        }
      },
      fontFamily: {
        // "sans" devient DM Sans pour tout le texte normal
        sans: ['"DM Sans"', 'sans-serif'],
        // "rounded" devient ton Roundy Rainbows
        rounded: ['RoundyRainbows', 'sans-serif'],
      },
    },
  },
  plugins: [],
}