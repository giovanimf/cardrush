import { toErrorResponse } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { PERMISSIONS, requirePermission } from "@/server/auth"
import { listSellerLots } from "@/server/lots"
import { totalReceivedCents } from "@/server/payments"

// GET /api/me/lots — painel do leiloeiro: meus lotes e total recebido (lot.view_own)
export async function GET() {
  try {
    const user = await requirePermission(PERMISSIONS.LOT_VIEW_OWN)
    const [lots, received] = await Promise.all([listSellerLots(prisma, user.id), totalReceivedCents(prisma, user.id)])
    return Response.json({ lots, totalReceivedCents: received })
  } catch (error) {
    return toErrorResponse(error)
  }
}
