import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '5a6fdd935cb2.ngrok-free.app',
      '.ngrok-free.app',
      '.ngrok.io'
    ]
  }
})
