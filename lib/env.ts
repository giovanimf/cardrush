import { z } from "zod"

// Valores de desenvolvimento: deixam o projeto subir sem configurar tudo,
// mas a trava de produção recusa qualquer um deles
export const DEV_DEFAULTS = {
  AUDIT_SECRET: "dev-audit-secret-do-not-use-in-production",
  PSEUDONYM_SECRET: "dev-pseudonym-secret-do-not-use-in-production",
  TURNSTILE_PASS_SECRET: "dev-turnstile-pass-secret-do-not-use-in-production",
  CRON_SECRET: "dev-cron-secret-do-not-use-in-production-000",
  // Chaves de teste públicas da Cloudflare (sempre passam)
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000BB",
} as const

// Outras chaves de teste da Cloudflare, também proibidas em produção
const TURNSTILE_TEST_SECRETS = [
  DEV_DEFAULTS.TURNSTILE_SECRET_KEY,
  "2x0000000000000000000000000000000AA",
  "3x0000000000000000000000000000000AA",
]

const flag = z.enum(["0", "1"]).transform((value) => value === "1")

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET precisa ter pelo menos 32 caracteres"),
  BETTER_AUTH_URL: z.url(),
  AUDIT_SECRET: z.string().min(32).default(DEV_DEFAULTS.AUDIT_SECRET),
  PSEUDONYM_SECRET: z.string().min(32).default(DEV_DEFAULTS.PSEUDONYM_SECRET),
  TEST_MODE: flag.default(false),
  TURNSTILE_SECRET_KEY: z.string().min(1).default(DEV_DEFAULTS.TURNSTILE_SECRET_KEY),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).default(DEV_DEFAULTS.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
  TURNSTILE_PASS_SECRET: z.string().min(32).default(DEV_DEFAULTS.TURNSTILE_PASS_SECRET),
  TURNSTILE_ENFORCE: flag.default(true),
  // Chave da rota que fecha lotes vencidos (cron externo)
  CRON_SECRET: z.string().min(32).default(DEV_DEFAULTS.CRON_SECRET),
  // Varredura de lotes vencidos dentro do próprio processo, em ms (0 = desligada)
  SETTLEMENT_SWEEP_MS: z.coerce.number().int().min(0).default(0),
  // Imprime cada consulta SQL no terminal (só para depurar; desligado deixa o terminal limpo)
  PRISMA_LOG_QUERIES: flag.default(false),
})

// Variável vazia (ex.: copiada do .env.example) conta como ausente e cai no padrão
const definedEnv = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""))

const parsed = schema.safeParse(definedEnv)

if (!parsed.success) {
  throw new Error(`Variáveis de ambiente inválidas:\n${z.prettifyError(parsed.error)}`)
}

export const env = parsed.data

export type Env = typeof env

// Trava de produção: devolve os motivos para o app não subir (lista vazia = ok)
export function productionLockViolations(values: Env): string[] {
  if (values.NODE_ENV !== "production") return []

  const violations: string[] = []

  if (values.TEST_MODE) violations.push("TEST_MODE=1 em produção")
  if (!values.TURNSTILE_ENFORCE) violations.push("TURNSTILE_ENFORCE=0 em produção")
  if (!values.BETTER_AUTH_URL.startsWith("https://")) violations.push("BETTER_AUTH_URL precisa ser https em produção")

  for (const key of ["AUDIT_SECRET", "PSEUDONYM_SECRET", "TURNSTILE_PASS_SECRET", "CRON_SECRET", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"] as const) {
    if (values[key] === DEV_DEFAULTS[key]) violations.push(`${key} usa o valor de desenvolvimento`)
  }

  if (TURNSTILE_TEST_SECRETS.includes(values.TURNSTILE_SECRET_KEY)) {
    violations.push("TURNSTILE_SECRET_KEY é uma chave de teste da Cloudflare")
  }

  // Chaves separadas: reaproveitar uma invalidaria a separação
  const secrets = [values.BETTER_AUTH_SECRET, values.AUDIT_SECRET, values.PSEUDONYM_SECRET, values.TURNSTILE_PASS_SECRET, values.CRON_SECRET]
  if (new Set(secrets).size !== secrets.length) violations.push("as chaves secretas precisam ser diferentes entre si")

  return violations
}

// No build (`next build`) o NODE_ENV também é production, mas o app ainda não está subindo
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build"
const violations = isBuildPhase ? [] : productionLockViolations(env)

if (violations.length > 0) {
  throw new Error(`Trava de produção: o app não sobe.\n- ${violations.join("\n- ")}`)
}
