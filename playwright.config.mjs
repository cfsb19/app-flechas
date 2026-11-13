import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.mjs',
  timeout: 30000,
  workers: 2,
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: 'npx vite build --mode e2e && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
