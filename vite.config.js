import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  // In dev the game runs on Vite's port, so forward Socket.IO and /api to the game server (npm run server).
  // If the server runs on another port (PORT=3002 npm run server), start Vite with SERVER_PORT=3002.
  server: {
    proxy: {
      '/socket.io': { target: `http://localhost:${process.env.SERVER_PORT || 3001}`, ws: true },
      '/api': `http://localhost:${process.env.SERVER_PORT || 3001}`,
    },
  },
  plugins: [
    vue({
      // <lottie-player> (win trophy) is a web component registered in src/main.js, not a Vue component
      template: { compilerOptions: { isCustomElement: (tag) => tag === 'lottie-player' } },
    }),
  ]
})
