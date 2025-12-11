/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.html",
    "./public/**/*.js",
    "./*.js"
  ],
  theme: {
    extend: {
      colors: {
        'gold': '#FFD700',
        'epic': '#A335EE',
        'rare': '#0070DD', 
        'uncommon': '#1EFF00',
      }
    },
  },
  plugins: [],
}