import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    // Le navigateur headless se déclare en-US : sans locale fixée, la
    // détection de langue rend l'app en anglais et casse les specs français.
    locale: 'fr-FR',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // `executablePath` ne vit que dans launchOptions — posé au niveau `use`,
        // il est ignoré. Surchargeable via PW_CHROMIUM ; sans variable, on laisse
        // Playwright résoudre son registre (PLAYWRIGHT_BROWSERS_PATH).
        ...(process.env.PW_CHROMIUM
          ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } }
          : {}),
        viewport: { width: 390, height: 844 }, // iPhone 14 Pro
      },
    },
  ],
  webServer: {
    command: 'npx vite preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
})
