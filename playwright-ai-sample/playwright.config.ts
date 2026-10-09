import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  reporter: [['list'], ['html', {
    open: 'never',
    outputFolder: process.env.PLAYWRIGHT_REPORT_DIR ?? 'playwright-report/combined'
  }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run demo',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true
  },
  projects: [
    {
      name: 'vanilla',
      testMatch: '**/vanilla-checkout.spec.ts',
      outputDir: 'evaluation/results/raw/vanilla',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'adaptive',
      testMatch: '**/adaptive-checkout.spec.ts',
      outputDir: 'evaluation/results/raw/adaptive',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'unit',
      testMatch: '**/confidence-store.spec.ts',
      outputDir: 'test-results/unit'
    }
  ]
});
