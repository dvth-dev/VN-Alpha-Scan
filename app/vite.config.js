import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/bapi': {
        target: 'https://www.binance.com',
        changeOrigin: true,
        secure: false,
        headers: {
          'Referer': 'https://www.binance.com/'
        }
      }
    }
  }
})
