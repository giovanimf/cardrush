import { AppError, toErrorResponse } from "@/lib/errors"
import { readIdempotencyKey, readJsonObject } from "@/lib/http"
import { PERMISSIONS, requirePermission } from "@/server/auth"
import { isValidBidAmount, placeBidAndDescribe } from "@/server/bidding"
import { assertWriteToken } from "@/server/security"

// POST /api/lots/:id/bids { amountCents, idempotencyKey? }
// Ordem: Turnstile → 1. valor inteiro positivo → 2. permissão bid.place → transação do lance
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertWriteToken(request)
    const body = await readJsonObject(request)

    if (!isValidBidAmount(body.amountCents)) throw new AppError("BID_INVALID_AMOUNT")
    const idempotencyKey = readIdempotencyKey(request, body)

    const user = await requirePermission(PERMISSIONS.BID_PLACE)
    const { id } = await params

    const { result, room, wallet } = await placeBidAndDescribe({
      lotId: id,
      bidderId: user.id,
      amountCents: body.amountCents,
      idempotencyKey,
    })

    return Response.json({ ...result, room, wallet }, { status: result.replayed ? 200 : 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
