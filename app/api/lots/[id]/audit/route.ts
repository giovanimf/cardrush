import { toErrorResponse } from "@/lib/errors"
import { verifyLot } from "@/server/audit"

// GET /api/lots/:id/audit — auditoria pública, sem login; recalculada a cada acesso
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    return Response.json(await verifyLot(id), { headers: { "cache-control": "no-store" } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
