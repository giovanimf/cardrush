import { toErrorResponse } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { getRoomState } from "@/server/bidding"

// GET /api/lots/:id — sala pública do lote (cancelado também abre, mostrando o estado)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    return Response.json(await getRoomState(prisma, id, user?.id))
  } catch (error) {
    return toErrorResponse(error)
  }
}
