import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
      },
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'AdraConnects',
        short_name: 'AdraConnects',
        description:
          'College club management & communication — chats, announcements, events and resources',
        theme_color: '#0B1E13',
        background_color: '#F8F9F6',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // precache the app shell; API/auth/storage calls always go to the network
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,png,svg}'],
      },
    }),
  ],
})
