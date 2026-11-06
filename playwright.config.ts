import { defineConfig, devices } from "@playwright/test";

// Local-only smoke test. It resets the database that .env.local points at (see e2e/global-setup.ts).
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: the global setup fails with a clear message.
}

const PORT = 3000;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The dev server compiles each route on first visit.
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
    // The e2e run needs the real browser executor and recorded (free) model answers.
    env: {
      LEGACY_READER: "browser",
      LLM_PROVIDER: "replay",
      LEGACY_BASE_URL: `http://localhost:${PORT}/legacy`,
    },
  },
});
