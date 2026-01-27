import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3003,
    allowedHosts: ['3003-iwz00ie3gdkhvxpx2ni1z-82b888ba.sandbox.novita.ai', '.sandbox.novita.ai'],
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
    },
  },
})
