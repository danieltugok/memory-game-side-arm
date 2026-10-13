const TIME_FLIPPING_CARD = 700
const TIME_SHOWING_CARD = 1200
const TIMER_START = 'start'
const TIMER_STOP = 'stop'
const TIMER_RESET = 'reset'
const BEGGINING_TIME_SHOWING_CARD = 3000

// Tailwind classes are written out in full so the JIT compiler picks them up.
const LEVELS = {
  easy: {
    label: 'Easy',
    pairs: 6,
    boardClass: 'grid-cols-4 gap-2 md:gap-4',
    cardSizeClass: 'w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32',
  },
  medium: {
    label: 'Medium',
    pairs: 12,
    boardClass: 'grid-cols-4 gap-2 md:grid-cols-6 md:gap-4 lg:grid-cols-8',
    cardSizeClass: 'w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32',
  },
  hard: {
    label: 'Hard',
    pairs: 24,
    boardClass: 'grid-cols-6 gap-2 md:grid-cols-8 md:gap-3',
    cardSizeClass: 'w-12 h-12 md:w-20 md:h-20 lg:w-24 lg:h-24',
  },
}


export default {
  TIME_FLIPPING_CARD,
  TIME_SHOWING_CARD,
  TIMER_START,
  TIMER_STOP,
  TIMER_RESET,
  BEGGINING_TIME_SHOWING_CARD,
  LEVELS
}