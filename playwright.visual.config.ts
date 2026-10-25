import { defineConfig, devices } from "@playwright/test";

/*
 * Visual regression checks for the Luxury Editorial redesign. They compare
 * full-page screenshots and computed styles against committed baselines, so
 * a styling change that should be invisible (such as adding Tailwind) is
 * proven to be. Run against the same seeded local stack as the e2e tests.
 * Baselines are Linux Chromium renders; update them only on purpose with
 * `npm run test:visual -- --update-snapshots`.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./visual",
  outputDir: "./test-results/visual",
  snapshotPathTemplate: "{testDir}/__snapshots__/{projectName}/{arg}{ext}",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 0,
      animations: "disabled",
      caret: "hide",
    },
  },
  use: {
    baseURL,
    reducedMotion: "reduce",
    colorScheme: "light",
    locale: "en-US",
    timezoneId: "Africa/Cairo",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
