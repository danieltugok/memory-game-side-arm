import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      // <lottie-player> (trophy animation) is a web component loaded in index.html
      template: { compilerOptions: { isCustomElement: (tag) => tag === 'lottie-player' } },
    }),
  ]
})
