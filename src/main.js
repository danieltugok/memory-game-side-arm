import { createApp } from 'vue'
import App from './App.vue'
import './index.css'


createApp(App).mount('#app')

// <lottie-player> web component for the win trophy. Bundled with the app (pinned version, no CDN)
// and loaded in the background after start-up, since it's only needed when someone wins.
import('@lottiefiles/lottie-player')
