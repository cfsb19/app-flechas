import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  build: { target: 'es2020' },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon-180.png'],
      manifest: {
        name: 'Flechas — verificação por visada',
        short_name: 'Flechas',
        description: 'Verificação de flechas de condutores e cabos de guarda com teodolito.',
        lang: 'pt-PT',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        theme_color: '#14213D',
        background_color: '#EDF0F2',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/version.json', '**/flechas.apk'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
