import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const pkgRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: path.join(pkgRoot, "e2e"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:5174",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 5174 --strictPort --host 127.0.0.1",
    cwd: pkgRoot,
    url: "http://127.0.0.1:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      VITE_EDEX_SKIP_BOOT: "1",
    },
  },
});
