import { AppError } from "@/lib/errors"

// Lê o corpo JSON como objeto; corpo ausente ou inválido vira VALIDATION_FAILED
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => undefined)

  if (body === undefined || body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError("VALIDATION_FAILED", { fields: { body: ["INVALID_JSON"] } })
  }

  return body as Record<string, unknown>
}

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_.:-]{1,100}$/

// Chave de idempotência opcional: cabeçalho Idempotency-Key ou campo idempotencyKey do corpo
export function readIdempotencyKey(request: Request, body?: Record<string, unknown>): string | null {
  const value = request.headers.get("idempotency-key") ?? body?.idempotencyKey

  if (value === undefined || value === null || value === "") return null

  if (typeof value !== "string" || !IDEMPOTENCY_KEY.test(value)) {
    throw new AppError("VALIDATION_FAILED", { fields: { idempotencyKey: ["INVALID"] } })
  }

  return value
}

// Página da listagem (?page=), a partir de 1
export function readPage(value: string | null): number {
  const page = Number(value ?? "1")
  return Number.isSafeInteger(page) && page >= 1 ? page : 1
}
