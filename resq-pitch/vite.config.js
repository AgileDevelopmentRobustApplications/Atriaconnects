import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps every asset URL relative, so the built `dist/` folder can be
// served from any path (or from a USB stick via `npm run preview`).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 900 },
})
