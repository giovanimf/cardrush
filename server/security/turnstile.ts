import { createHmac, timingSafeEqual } from "node:crypto"
import { AppError } from "@/lib/errors"
import { env } from "@/lib/env"
import { RULES } from "@/lib/rules"

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

// Nome do cabeçalho (rotas) e do campo de formulário (server actions) que levam o token
export const TURNSTILE_TOKEN_FIELD = "cf-turnstile-response"
export const READ_PASS_COOKIE = "ts_pass"

// Motivo técnico da recusa; a mensagem para o usuário é sempre a genérica de TURNSTILE_FAILED
export type TurnstileReason =
  | "TOKEN_MISSING"
  | "TOKEN_INVALID"
  | "TOKEN_REUSED"
  | "VERIFICATION_UNAVAILABLE"
  | "PASS_MISSING"
  | "PASS_INVALID"
  | "PASS_EXPIRED"

export function turnstileError(reason: TurnstileReason) {
  return new AppError("TURNSTILE_FAILED", { reason })
}

type SiteverifyResult = { success: boolean; "error-codes"?: string[] }

// Valida o token na Cloudflare. Falha fechada: rede, timeout, 5xx ou internal-error recusam.
// Nunca guarda sucesso em cache: cada token vale para uma única escrita.
export async function verifyTurnstileToken(token: string | null | undefined, remoteIp?: string | null) {
  if (!env.TURNSTILE_ENFORCE) return

  // A Cloudflare aceita tokens de até 2048 caracteres
  if (!token || token.length > 2048) throw turnstileError("TOKEN_MISSING")

  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token })
  if (remoteIp) body.set("remoteip", remoteIp)

  let result: SiteverifyResult | null

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(RULES.TURNSTILE_VERIFY_TIMEOUT_MS),
    })

    result = response.ok ? ((await response.json()) as SiteverifyResult) : null
  } catch {
    result = null
  }

  if (!result) throw turnstileError("VERIFICATION_UNAVAILABLE")
  if (result.success) return

  const codes = result["error-codes"] ?? []

  if (codes.includes("internal-error")) throw turnstileError("VERIFICATION_UNAVAILABLE")
  if (codes.includes("timeout-or-duplicate")) throw turnstileError("TOKEN_REUSED")
  throw turnstileError("TOKEN_INVALID")
}

function clientIp(request: Request): string | null {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null
}

// Escritas: valida o token antes de qualquer outra checagem.
// Aceita o request (cabeçalho), o FormData de uma server action ou o token já extraído.
export async function assertWriteToken(source: Request | FormData | string | null | undefined) {
  if (source instanceof Request) {
    return verifyTurnstileToken(source.headers.get(TURNSTILE_TOKEN_FIELD), clientIp(source))
  }

  if (source instanceof FormData) {
    const value = source.get(TURNSTILE_TOKEN_FIELD)
    return verifyTurnstileToken(typeof value === "string" ? value : null)
  }

  return verifyTurnstileToken(source)
}

// Passe de leitura: "expiraEm.HMAC(segredo, 'turnstile-pass:' + expiraEm)".
// Validado localmente no proxy, sem chamar a Cloudflare (BR-SEC-01).
function signPass(expiresAtMs: number): string {
  return createHmac("sha256", env.TURNSTILE_PASS_SECRET).update(`turnstile-pass:${expiresAtMs}`).digest("base64url")
}

export function issueReadPass(nowMs: number) {
  const expiresAtMs = nowMs + RULES.TURNSTILE_PASS_TTL_MS
  return { value: `${expiresAtMs}.${signPass(expiresAtMs)}`, expiresAtMs }
}

// Devolve o motivo da recusa, ou null se o passe vale
export function checkReadPass(value: string | null | undefined, nowMs: number): TurnstileReason | null {
  if (!value) return "PASS_MISSING"

  const [expiresAtText, signature, ...rest] = value.split(".")
  const expiresAtMs = Number(expiresAtText)

  if (rest.length > 0 || !signature || !/^\d+$/.test(expiresAtText) || !Number.isSafeInteger(expiresAtMs)) {
    return "PASS_INVALID"
  }

  const expected = Buffer.from(signPass(expiresAtMs))
  const received = Buffer.from(signature)

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return "PASS_INVALID"
  if (expiresAtMs <= nowMs) return "PASS_EXPIRED"

  return null
}

export const readPassCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
  path: "/",
  maxAge: RULES.TURNSTILE_PASS_TTL_MS / 1000,
} as const
