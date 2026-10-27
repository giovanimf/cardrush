import { toErrorResponse } from "@/lib/errors"
import { readIdempotencyKey, readJsonObject } from "@/lib/http"
import { PERMISSIONS, requirePermission } from "@/server/auth"
import { deposit } from "@/server/payments"
import { assertWriteToken } from "@/server/security"

// POST /api/wallet/deposits { amount: "500,00", idempotencyKey? } — depósito simulado (wallet.deposit)
export async function POST(request: Request) {
  try {
    await assertWriteToken(request)
    const user = await requirePermission(PERMISSIONS.WALLET_DEPOSIT)
    const body = await readJsonObject(request)
    const result = await deposit(user.id, body.amount, readIdempotencyKey(request, body))
    return Response.json(result, { status: result.replayed ? 200 : 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
