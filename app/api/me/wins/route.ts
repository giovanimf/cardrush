import { toErrorResponse } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { PERMISSIONS, requirePermission } from "@/server/auth"
import { listWins } from "@/server/settlement"

// GET /api/me/wins — meus arremates (bids.view_own)
export async function GET() {
  try {
    const user = await requirePermission(PERMISSIONS.BIDS_VIEW_OWN)
    return Response.json({ wins: await listWins(prisma, user.id) })
  } catch (error) {
    return toErrorResponse(error)
  }
}
