import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  // In dev the game runs on Vite's port, so forward Socket.IO to the game server (npm run server)
  server: {
    proxy: {
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    },
  },
  plugins: [
    vue({
      // <lottie-player> (trophy animation) is a web component loaded in index.html
      template: { compilerOptions: { isCustomElement: (tag) => tag === 'lottie-player' } },
    }),
  ]
})
