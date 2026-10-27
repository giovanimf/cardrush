import "server-only"
import { AppError } from "@/lib/errors"
import { getCurrentUser, type CurrentUser } from "@/lib/session"
import { PERMISSIONS, type PermissionKey } from "@/server/auth/permissions"

export function hasPermission(user: CurrentUser, key: PermissionKey): boolean {
  return user.permissions.includes(key)
}

// Confere a permissão de uma ação para um usuário já carregado.
// O código checa permissão, nunca o nome do papel.
export function assertPermission(user: CurrentUser | null, key: PermissionKey): CurrentUser {
  if (!user) {
    throw new AppError("AUTH_REQUIRED")
  }

  if (hasPermission(user, key)) return user

  // Caso especial: quem cria lotes e não dá lances recebe a mensagem específica
  if (key === PERMISSIONS.BID_PLACE && hasPermission(user, PERMISSIONS.LOT_CREATE)) {
    throw new AppError("BID_AUCTIONEER_NOT_ALLOWED")
  }

  throw new AppError("FORBIDDEN", { permission: key })
}

// Guarda de toda rota e server action protegida.
// Lança AUTH_REQUIRED (sem sessão) ou FORBIDDEN { permission }.
export async function requirePermission(key: PermissionKey): Promise<CurrentUser> {
  return assertPermission(await getCurrentUser(), key)
}
