import { toErrorResponse } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { PERMISSIONS } from "@/server/auth"
import { getWallet } from "@/server/payments"

// GET /api/me — quem está logado, permissões (a interface esconde menus por elas; o servidor
// confere de novo em cada ação) e o saldo, para a barra superior. Visitante recebe user: null.
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ user: null, wallet: null }, { headers: { "cache-control": "no-store" } })

    const wallet = user.permissions.includes(PERMISSIONS.WALLET_VIEW) ? await getWallet(prisma, user.id) : null
    return Response.json({ user, wallet }, { headers: { "cache-control": "no-store" } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
