import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/AgroPOS/', // GitHub Pages: github.com/SHADOWHITE12/AgroPOS
  server: {
    port: 5173,
    strictPort: true,
    host: true
  }
})
