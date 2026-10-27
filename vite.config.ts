/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/project-life/',
  plugins: [
    react(),
    tailwindcss(),
    // Installable and offline: everything the app needs, every UK nation's tables included, is precached from this
    // site. New versions wait for the person to choose to reload (registerType: 'prompt').
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Your Life',
        short_name: 'Your Life',
        description: 'Your life in weeks: a private life calendar. Nothing you enter leaves your device.',
        start_url: '/project-life/',
        scope: '/project-life/',
        display: 'standalone',
        background_color: '#f5efe3',
        theme_color: '#f5efe3',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Font subsets for scripts the page doesn't use still load on demand if ever needed.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,vietnamese}-*.woff2'],
        navigateFallback: 'index.html',
        // The old pages are redirects, not app routes.
        navigateFallbackDenylist: [/\/(years|months|weeks)\.html$/],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // The first visit is offline-ready without a reload. Updates still wait (no skipWaiting): the new worker
        // only takes over when the person chooses Reload.
        clientsClaim: true,
        // Other countries' tables (237 files) aren't precached: each is fetched from this site when picked, then kept
        // for offline use, refreshed in the background when online.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/project-life/data/countries/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'countries', expiration: { maxEntries: 30 } },
          },
        ],
      },
    }),
  ],
  build: {
    // The main chunk carries the UK life tables (about 60 kB gzipped) so the grid can be sized on first paint.
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
