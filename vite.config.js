import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const here = p => fileURLToPath(new URL(p, import.meta.url));

const pwa = VitePWA({
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
    // Estes têm de vir sempre do servidor (download do APK e aviso de versão).
    navigateFallbackDenylist: [/^\/flechas\.apk$/, /^\/version\.json$/],
    cleanupOutdatedCaches: true,
  },
});

export default defineConfig(({ mode }) => {
  const base = { define: { __APP_VERSION__: JSON.stringify(pkg.version) } };
  if (mode === 'ficheiro') {
    // Cópia num único ficheiro HTML, sem login nem service worker (ver scripts/inline-html.mjs).
    return {
      ...base,
      base: './',
      publicDir: false,
      resolve: { alias: [
        { find: 'virtual:pwa-register', replacement: here('./src/pwa-stub.js') },
        { find: /^\.\/access\/auth-(firebase|fake)\.js$/, replacement: here('./src/access/auth-none.js') },
      ] },
      build: {
        target: 'es2020', outDir: 'dist-local', emptyOutDir: true,
        assetsInlineLimit: 100_000_000, cssCodeSplit: false, modulePreload: false,
        rollupOptions: { output: { inlineDynamicImports: true } },
      },
    };
  }
  return { ...base, build: { target: 'es2020' }, plugins: [pwa] };
});
