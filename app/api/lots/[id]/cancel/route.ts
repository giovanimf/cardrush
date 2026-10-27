import { toErrorResponse } from "@/lib/errors"
import { PERMISSIONS, requirePermission } from "@/server/auth"
import { cancelLot } from "@/server/lots"
import { assertWriteToken } from "@/server/security"

// POST /api/lots/:id/cancel — só o dono, só sem lances (lot.cancel)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertWriteToken(request)
    const user = await requirePermission(PERMISSIONS.LOT_CANCEL)
    const { id } = await params
    return Response.json({ lot: await cancelLot(user.id, id) })
  } catch (error) {
    return toErrorResponse(error)
  }
}
