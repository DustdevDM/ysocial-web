import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3012",
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
  },
  webServer: {
    command: "pnpm exec vite --host 127.0.0.1 --port 3012",
    url: "http://127.0.0.1:3012",
    reuseExistingServer: !process.env.CI,
  },
});
