import { toErrorResponse } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { getReceipt } from "@/server/settlement"

// GET /api/receipts/:code — comprovante público, sem login e sem dados pessoais
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    return Response.json({ receipt: await getReceipt(prisma, code) })
  } catch (error) {
    return toErrorResponse(error)
  }
}
