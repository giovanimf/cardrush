import { z } from "zod"
import { isAPIError } from "better-auth/api"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { AppError } from "@/lib/errors"
import type { Db } from "@/lib/prisma"
import { RULES } from "@/lib/rules"
import { ALL_PERMISSIONS, DEFAULT_ROLES } from "@/server/auth/permissions"

// Sem "server-only" aqui: o seed (tsx, fora do Next) também usa este arquivo.

// Garante permissões, papéis padrão e vínculos. Idempotente: pode rodar a cada seed ou deploy.
// Não remove vínculos extras: papéis e permissões criados direto no banco continuam valendo.
export async function ensureBaseData(db: Db) {
  for (const key of ALL_PERMISSIONS) {
    await db.permission.upsert({ where: { key }, update: {}, create: { key } })
  }

  const permissions = await db.permission.findMany({ where: { key: { in: ALL_PERMISSIONS } } })
  const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]))

  for (const definition of Object.values(DEFAULT_ROLES)) {
    const role = await db.role.upsert({
      where: { name: definition.name },
      update: {},
      create: { name: definition.name, publicSignup: definition.publicSignup },
    })

    await db.rolePermission.createMany({
      data: definition.permissions.map((key) => ({ roleId: role.id, permissionId: permissionIdByKey.get(key)! })),
      skipDuplicates: true,
    })
  }
}

export const registerInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(100),
  email: z.email("E-mail inválido").trim().toLowerCase(),
  password: z.string().min(RULES.PASSWORD_MIN_LENGTH, `Mínimo de ${RULES.PASSWORD_MIN_LENGTH} caracteres`).max(128),
  role: z.string().trim().min(1, "Escolha um papel"),
})

export type RegisterInput = z.input<typeof registerInputSchema>

// Papéis que aparecem na escolha do cadastro público
export async function listPublicRoles(db: Db) {
  return db.role.findMany({ where: { publicSignup: true }, select: { name: true }, orderBy: { name: "asc" } })
}

// Cadastro com papel. `headers` vem da server action, para o Better Auth gravar o cookie de sessão.
export async function registerUser(db: Db, input: RegisterInput, headers?: Headers) {
  const parsed = registerInputSchema.safeParse(input)

  if (!parsed.success) {
    throw new AppError("VALIDATION_FAILED", { fields: z.flattenError(parsed.error).fieldErrors })
  }

  const { name, email, password, role: roleName } = parsed.data

  // Papel fora do cadastro público é recusado como se não existisse
  const role = await db.role.findFirst({ where: { name: roleName, publicSignup: true }, select: { id: true } })

  if (!role) {
    throw new AppError("VALIDATION_FAILED", { fields: { role: ["Papel inválido"] } })
  }

  const existing = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  })

  if (existing) {
    throw new AppError("EMAIL_ALREADY_REGISTERED")
  }

  try {
    // roleId gravado junto com o usuário, no mesmo insert do Better Auth
    return await auth.api.signUpEmail({ body: { name, email, password, roleId: role.id }, headers })
  } catch (error) {
    // Corrida entre dois cadastros com o mesmo e-mail: o índice único resolve
    const isDuplicate =
      (isAPIError(error) && error.body?.code === "USER_ALREADY_EXISTS") ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")

    if (isDuplicate) throw new AppError("EMAIL_ALREADY_REGISTERED")
    throw error
  }
}
