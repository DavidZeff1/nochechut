import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.webp', 'favicon.png', 'courses/*.webp'],
      manifest: {
        name: 'נוכחות חוגים – גרעין אומץ',
        short_name: 'נוכחות חוגים',
        description: 'סימון נוכחות בחוגים של גרעין אומץ עכו',
        lang: 'he',
        dir: 'rtl',
        theme_color: '#1847a8',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,webp,png,svg,woff2}'],
        // The guide's screenshots load when the guide is opened, not with the app install.
        globIgnores: ['guide/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/guide/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'guide', expiration: { maxEntries: 40 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  // Firebase (Firestore + Auth + Storage) is most of the main bundle; it is cached by the service worker after the first visit.
  build: { chunkSizeWarningLimit: 1100 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
