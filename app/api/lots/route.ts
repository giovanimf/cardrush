import type { NextRequest } from "next/server"
import { AppError, toErrorResponse } from "@/lib/errors"
import { readJsonObject, readPage } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { PERMISSIONS, requirePermission } from "@/server/auth"
import { getCatalogSource } from "@/server/catalog"
import { createLot, listShowcase, SHOWCASE_TABS, type ShowcaseTab } from "@/server/lots"
import { assertWriteToken } from "@/server/security"

// GET /api/lots?tab=live|scheduled|ended&page=1&q= — vitrine pública (q busca por nome ou coleção)
export async function GET(request: NextRequest) {
  try {
    const tab = request.nextUrl.searchParams.get("tab") ?? "live"
    if (!(SHOWCASE_TABS as readonly string[]).includes(tab)) {
      throw new AppError("VALIDATION_FAILED", { fields: { tab: ["INVALID"] } })
    }
    const page = readPage(request.nextUrl.searchParams.get("page"))
    const query = request.nextUrl.searchParams.get("q") ?? ""
    return Response.json(await listShowcase(prisma, tab as ShowcaseTab, page, query))
  } catch (error) {
    return toErrorResponse(error)
  }
}

// POST /api/lots — cria e publica um lote (lot.create)
export async function POST(request: Request) {
  try {
    await assertWriteToken(request)
    const user = await requirePermission(PERMISSIONS.LOT_CREATE)
    const lot = await createLot(prisma, getCatalogSource(), user.id, await readJsonObject(request))
    return Response.json({ lot }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
