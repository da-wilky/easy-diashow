import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', actionTimeout: 15_000, locale: 'de-DE' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // vite's cli.js directly: editor extensions (Console Ninja) patch bin/vite.js and inject inline scripts, which the CSP blocks
    command: 'node node_modules/vite/dist/node/cli.js build && node node_modules/vite/dist/node/cli.js preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
})
