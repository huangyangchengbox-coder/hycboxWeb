import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/web/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://hychyr.top',
        changeOrigin: true
      }
    }
  }
})
