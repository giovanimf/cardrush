import path from "node:path"
import { defineConfig, devices } from "@playwright/test"
import base from "../../playwright.config"

// Gravação das telas do vídeo de apresentação. Usa o mesmo servidor de teste dos E2E
// (porta 3100, banco e2e, relógio controlável) e o mesmo aquecimento de rotas.
const ROOT = path.resolve(__dirname, "../..")

export default defineConfig({
  ...base,
  testDir: __dirname,
  globalSetup: path.join(ROOT, "e2e/global-setup.ts"),
  timeout: 15 * 60_000,
  expect: { timeout: 20_000 },
  retries: 0,
  reporter: [["list"]],
  outputDir: path.join(__dirname, "..", ".test-results"),
  use: { ...base.use, trace: "off", screenshot: "off" },
  projects: [
    { name: "warmup", testDir: path.join(ROOT, "e2e"), testMatch: /warmup.setup.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "record", dependencies: ["warmup"], testMatch: /scenes.spec.ts/, use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: { ...(base.webServer as object), cwd: ROOT } as typeof base.webServer,
})
