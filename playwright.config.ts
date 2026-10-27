import "dotenv/config"
import { defineConfig, devices } from "@playwright/test"

// Testes ponta a ponta (F10.3). Sobem um servidor próprio, ao lado do `next dev` normal:
// - pasta .next-e2e (o Next trava um dev server por pasta) e porta 3100
// - TEST_MODE=1 (relógio controlável, modos da Scryfall, rotas /api/test)
// - banco E2E_DATABASE_URL (schema e2e): o reset dos testes apaga os dados dele
// - chaves de teste do Turnstile (sempre passam) e liquidação a cada 1 s

const PORT = 3100
const BASE_URL = `http://localhost:${PORT}`
const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL

if (!E2E_DATABASE_URL) {
  throw new Error("Defina E2E_DATABASE_URL no .env (banco separado: o reset dos testes apaga os dados).")
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Os testes compartilham o banco e o relógio do servidor: um de cada vez
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // Uma nova tentativa para quedas de conexão do banco de teste (o endpoint direto do Neon
  // fecha conexões ociosas); o relatório marca como "flaky" o que só passou na segunda
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Aquece as rotas do next dev antes dos testes
    { name: "warmup", testMatch: /warmup.setup.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "desktop", dependencies: ["warmup"], use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      TEST_MODE: "1",
      DATABASE_URL: E2E_DATABASE_URL,
      DIRECT_DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_URL: BASE_URL,
      SETTLEMENT_SWEEP_MS: "1000",
      TURNSTILE_ENFORCE: "1",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000BB",
    },
  },
})

