import "dotenv/config"
import { execSync } from "node:child_process"

// Antes dos testes: aplica as migrations no banco E2E (nunca no banco do .env)
export default function globalSetup() {
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: process.env.E2E_DATABASE_URL, DIRECT_DATABASE_URL: process.env.E2E_DATABASE_URL },
  })
}
