import { toErrorResponse } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { listPublicRoles } from "@/server/auth"

// GET /api/roles — papéis que aparecem no cadastro público (dados, não código)
export async function GET() {
  try {
    const roles = await listPublicRoles(prisma)
    return Response.json({ roles: roles.map((role) => role.name) })
  } catch (error) {
    return toErrorResponse(error)
  }
}
