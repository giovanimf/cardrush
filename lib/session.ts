import "server-only"
import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type CurrentUser = {
  id: string
  name: string
  role: string
  permissions: string[]
}

// Deduplica a leitura da sessão dentro do mesmo request
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() })
})

export async function requireSession() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return session
}

// Papel e permissões lidos do banco a cada request (não do cache do cookie),
// para uma mudança de permissão valer na hora
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession()

  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      role: {
        select: {
          name: true,
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  })

  if (!user) return null

  return {
    id: user.id,
    name: user.name,
    role: user.role.name,
    permissions: user.role.permissions.map(({ permission }) => permission.key),
  }
})
