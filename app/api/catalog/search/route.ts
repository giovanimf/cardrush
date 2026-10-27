import type { NextRequest } from "next/server"
import { toErrorResponse } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { PERMISSIONS, requirePermission } from "@/server/auth"
import { getCatalogSource, searchCatalog } from "@/server/catalog"

// GET /api/catalog/search?q= — protegida por catalog.search (passe Turnstile checado no proxy)
export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.CATALOG_SEARCH)
    const items = await searchCatalog(prisma, getCatalogSource(), request.nextUrl.searchParams.get("q") ?? "")
    return Response.json({ items })
  } catch (error) {
    return toErrorResponse(error)
  }
}
