import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/vehicle-models': {
        target: 'https://rsi-website-models.42kit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vehicle-models/, '/vehicles'),
      },
    },
  },
})
