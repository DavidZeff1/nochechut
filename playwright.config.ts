import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the demo build (in-browser data, no Firebase needed).
 * Set CHROME_PATH to use an installed Chrome instead of Playwright's own Chromium.
 */
const executablePath = process.env.CHROME_PATH || undefined;
const PORT = 4321;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    trace: 'retain-on-failure',
    launchOptions: { executablePath },
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 780 }, launchOptions: { executablePath } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 }, launchOptions: { executablePath } },
    },
  ],
  webServer: {
    command: `npx vite build --mode demo --outDir dist-demo && npx vite preview --mode demo --outDir dist-demo --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
