import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "logic", testMatch: "trip-updates.spec.ts" },
    {
      name: "desktop",
      testMatch: ["travel-screens.spec.ts", "notifications-detail.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      testMatch: ["travel-screens.spec.ts", "notifications-detail.spec.ts"],
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NEXT_PUBLIC_NOTIFICATION_STREAM_URL: "/api/notifications/stream",
      NEXT_DIST_DIR: ".next-test",
    },
  },
});
