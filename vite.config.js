import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/web/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://8.152.99.189',
        changeOrigin: true
      }
    }
  }
})
