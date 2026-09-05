import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // App data lives entirely on the server now (see src/db/) — this
      // only precaches the app shell (HTML/JS/CSS/icons) so it installs
      // and opens instantly. It deliberately does NOT cache API responses:
      // this app assumes internet is available, and stale cached bills/
      // doctors would be actively misleading rather than helpful offline.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      manifest: {
        name: 'Arati Enterprises Billing',
        short_name: 'Arati Billing',
        description: 'Billing app for Arati Enterprises',
        start_url: '/',
        display: 'standalone',
        background_color: '#F4F5F7',
        theme_color: '#1F4E79',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
