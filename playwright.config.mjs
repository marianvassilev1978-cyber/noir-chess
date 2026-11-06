// Playwright: headless Chromium in an iPhone 13 viewport, against the built docs/.
import { defineConfig, devices } from "@playwright/test";
const { defaultBrowserType, ...iphone } = devices["iPhone 13"];
export default defineConfig({
  testDir: "tools/test",
  timeout: 180000,
  expect: { timeout: 15000 },
  workers: 2,
  reporter: [["list"]],
  use: { ...iphone, browserName: "chromium", baseURL: "http://127.0.0.1:8930/", screenshot: "only-on-failure" },
  webServer: { command: "node tools/serve.cjs docs 8930", url: "http://127.0.0.1:8930/", reuseExistingServer: false },
});
