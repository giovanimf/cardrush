// Domínio security: anti-bot (Cloudflare Turnstile).
// Outros domínios importam só deste arquivo, nunca de arquivos internos.
export {
  TURNSTILE_TOKEN_FIELD,
  READ_PASS_COOKIE,
  readPassCookieOptions,
  verifyTurnstileToken,
  assertWriteToken,
  issueReadPass,
  checkReadPass,
  turnstileError,
  type TurnstileReason,
} from "@/server/security/turnstile"
