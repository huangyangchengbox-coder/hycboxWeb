import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue()],
    base: env.VITE_BASE || '/web/',
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'https://hychyr.top',
          changeOrigin: true
        },
        '/api-trial': {
          target: 'https://hychyr.top',
          changeOrigin: true
        }
      }
    }
  }
})
