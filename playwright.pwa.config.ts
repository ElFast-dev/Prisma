import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4174/Prisma/";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/pwa-offline.e2e.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report-pwa", open: "never" }]
  ],
  outputDir: "test-results-pwa",
  use: {
    baseURL,
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    serviceWorkers: "allow"
  },
  projects: [
    {
      name: "chromium-pwa",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 }
      }
    }
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4174 --strictPort",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
