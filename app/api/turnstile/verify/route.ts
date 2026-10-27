import { NextResponse } from "next/server"
import { clock } from "@/lib/clock"
import { toErrorResponse } from "@/lib/errors"
import { assertWriteToken, issueReadPass, READ_PASS_COOKIE, readPassCookieOptions } from "@/server/security"

// Troca um token Turnstile válido por um passe de leitura de 4 min (cookie ts_pass)
export async function POST(request: Request) {
  try {
    await assertWriteToken(request)
  } catch (error) {
    return toErrorResponse(error)
  }

  const pass = issueReadPass(clock.nowMs())
  const response = NextResponse.json({ expiresAt: new Date(pass.expiresAtMs).toISOString() })
  response.cookies.set(READ_PASS_COOKIE, pass.value, readPassCookieOptions)

  return response
}
