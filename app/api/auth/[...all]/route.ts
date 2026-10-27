import { auth } from "@/lib/auth"
import { toErrorResponse } from "@/lib/errors"
import { assertWriteToken } from "@/server/security"
import { toNextJsHandler } from "better-auth/next-js"

const handler = toNextJsHandler(auth)

// Leituras passam pelo passe do proxy
export const GET = handler.GET

// Escritas (login etc.) exigem token Turnstile novo. Sair da conta é a exceção:
// não traz risco de abuso e precisa funcionar mesmo com a Cloudflare fora.
export async function POST(request: Request) {
  if (!new URL(request.url).pathname.endsWith("/sign-out")) {
    try {
      await assertWriteToken(request)
    } catch (error) {
      return toErrorResponse(error)
    }
  }

  return handler.POST(request)
}
