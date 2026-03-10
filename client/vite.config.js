import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/agro-sistema/', // GitHub Pages: github.com/SHADOWHITE12/agro-sistema
  server: {
    port: 5173,
    strictPort: true,
    host: true
  }
})
