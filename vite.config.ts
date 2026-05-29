import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-gincana.jpg', 'logo-igreja.png'],
      manifest: {
        name: 'Gincana EBD 2026',
        short_name: 'EBD 2026',
        description:
          'Acompanhe a Gincana EBD 2026 ao vivo: ranking, equipes, semanas, conquistas e novidades.',
        theme_color: '#0b1f4d',
        background_color: '#fdf8ee',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: '/logo-gincana.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any',
          },
          {
            src: '/logo-gincana.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any',
          },
          {
            src: '/logo-gincana.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff2}'],
        runtimeCaching: [
          {
            // cache de imagens do Supabase Storage
            urlPattern:
              /^https:\/\/dmvqnqjctlgxeacdnkoq\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
