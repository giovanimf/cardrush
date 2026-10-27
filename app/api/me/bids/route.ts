import { toErrorResponse } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { PERMISSIONS, requirePermission } from "@/server/auth"
import { listParticipation } from "@/server/bidding"

// GET /api/me/bids — lotes em que dei lance, com posição e resultado (bids.view_own)
export async function GET() {
  try {
    const user = await requirePermission(PERMISSIONS.BIDS_VIEW_OWN)
    return Response.json(await listParticipation(prisma, user.id), { headers: { "cache-control": "no-store" } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
