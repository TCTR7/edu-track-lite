import { defineConfig, devices } from "@playwright/test";

const isAiAgent = process.env.AI_AGENT === "1";
const isHeadless = isAiAgent || process.env.E2E_HEADLESS === "1";
const includeMobile = process.env.E2E_MOBILE === "1";
const freshServer = process.env.E2E_FRESH_SERVER === "1" || !!process.env.CI;
const diagnostics = !isAiAgent || process.env.E2E_DIAGNOSTICS === "1";

export default defineConfig({
  testDir: "./automation_test/features",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  maxFailures: isAiAgent ? 1 : 0,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: isAiAgent ? [["line"]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    headless: isHeadless,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000,
    trace: diagnostics ? "retain-on-failure" : "off",
    video: !isAiAgent ? "retain-on-failure" : "off",
    screenshot: diagnostics ? "only-on-failure" : "off",
    launchOptions: {
      slowMo: isHeadless ? 0 : 500,
    },
  },
  projects: [
    {
      name: "chromium-headed",
      use: { ...devices["Desktop Chrome"] },
    },
    ...(includeMobile
      ? [{ name: "chromium-mobile", use: { ...devices["Pixel 7"] } }]
      : []),
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000/login",
    reuseExistingServer: !freshServer,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
