import { defineConfig, devices } from '@playwright/test';

/**
 * Runs against the dev server + dev database (the one seeded by
 * `prisma db seed`), not the isolated Vitest test database — these are
 * full user-journey checks, not unit tests, and rely on the seeded demo
 * accounts (see prisma/seed.ts) and catalog existing.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // shared seeded accounts/cart state — avoid cross-test interference
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
