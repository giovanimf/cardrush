import { headers } from "next/headers"
import { toErrorResponse } from "@/lib/errors"
import { readJsonObject } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { registerUser } from "@/server/auth"
import { assertWriteToken } from "@/server/security"

// POST /api/signup { name, email, password, role } — cadastro com papel do cadastro público.
// Ordem: Turnstile antes de qualquer outra checagem. Já deixa a sessão aberta (cookie).
export async function POST(request: Request) {
  try {
    await assertWriteToken(request)
    const body = await readJsonObject(request)
    await registerUser(
      prisma,
      { name: String(body.name ?? ""), email: String(body.email ?? ""), password: String(body.password ?? ""), role: String(body.role ?? "") },
      await headers(),
    )
    return Response.json({ ok: true }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
