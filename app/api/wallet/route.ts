import type { NextRequest } from "next/server"
import { toErrorResponse } from "@/lib/errors"
import { readPage } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { PERMISSIONS, requirePermission } from "@/server/auth"
import { entries, getWallet } from "@/server/payments"

// GET /api/wallet?page=1 — saldo (total, comprometido, disponível) e extrato (wallet.view)
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.WALLET_VIEW)
    const page = readPage(request.nextUrl.searchParams.get("page"))
    const [wallet, statement] = await Promise.all([getWallet(prisma, user.id), entries(prisma, user.id, page)])
    return Response.json({ wallet, entries: statement })
  } catch (error) {
    return toErrorResponse(error)
  }
}
