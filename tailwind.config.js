/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily:{
        sans: 'Roboto, sans-serif'
      },
      colors: {
        blue: {
          500: '#22384B',
        },
        orange: {
          500: '#F47D20',
        },        
      },
    },
  },
  plugins: [],
}
