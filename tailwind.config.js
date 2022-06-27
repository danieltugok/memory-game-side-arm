/** @type {import('tailwindcss').Config} */

const plugin = require('tailwindcss/plugin')

const backfaceVisibility = plugin(function({addUtilities}) {
  addUtilities({
    '.backface-visible': {
      'backface-visibility': 'visible',
    },
    '.backface-hidden': {
      'backface-visibility': 'hidden',
    }
  })
});

const rotateY = plugin(function({addUtilities}) {
  addUtilities({
    '.rotate-y-180': {
      'transform': 'rotateY(180deg)',
    }
  })
});

const perspective = plugin(function({addUtilities}) {
  addUtilities({
    '.perspective-1000': {
      'perspective': '1000px',
    }
  })
});

const preserve3d = plugin(function({addUtilities}) {
  addUtilities({
    '.preserve-3d': {
      'transform-style': 'preserve-3d',
    }
  })
});


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
        green: {
          500: '#112325',
        },        
      },
    },
  },
  plugins: [backfaceVisibility, rotateY, perspective, preserve3d],
}
