'use strict';

const { defineConfig, devices } = require('@playwright/test');

// Siseveeb on tootmiskeskkond, seega ajapiirid on pikemad ja korduskatsed
// välja lülitatud – tulemus peab olema aus.
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  outputDir: 'test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'https://opilane.siseveeb.voco.ee',
    locale: 'et-EE',
    timezoneId: 'Europe/Tallinn',
    viewport: { width: 1600, height: 1100 },
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
    ignoreHTTPSErrors: false,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1600, height: 1100 },
      },
    },
  ],
});
