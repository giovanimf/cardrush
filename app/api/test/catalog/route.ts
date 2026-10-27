import { AppError } from "@/lib/errors"
import { testOnly } from "@/lib/test-mode"
import { catalogTestStateSchema, getCatalogTestState, setCatalogTestState } from "@/server/catalog"

// Rota de teste: troca o modo simulado do catálogo (normal, down, rate_limited, no_image, no_title)
export const GET = testOnly(async () => Response.json(getCatalogTestState()))

export const POST = testOnly(async (request) => {
  const parsed = catalogTestStateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw new AppError("VALIDATION_FAILED", { issues: parsed.error.issues })

  setCatalogTestState(parsed.data)
  return Response.json(parsed.data)
})
