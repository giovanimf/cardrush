import { toErrorResponse } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { getRoomUpdate } from "@/server/bidding"

// GET /api/lots/:id/room — estado leve da sala para o polling (F9.2)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    return Response.json(await getRoomUpdate(prisma, id, user?.id), { headers: { "cache-control": "no-store" } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
