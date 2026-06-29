import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://ec2-13-60-247-126.eu-north-1.compute.amazonaws.com:10000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
