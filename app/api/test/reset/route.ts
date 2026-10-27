import { clock } from "@/lib/clock"
import { AppError } from "@/lib/errors"
import { testOnly } from "@/lib/test-mode"
import { setCatalogTestState } from "@/server/catalog"
import { resetDemo } from "@/server/demo"

// POST /api/test/reset — volta o banco ao estado do seed, o relógio ao normal e a Scryfall ao modo normal
export const POST = testOnly(async () => {
  const adminEmail = process.env.SEED_EMAIL
  const adminPassword = process.env.SEED_PASSWORD
  const bidderPassword = process.env.SEED_BIDDER_PASSWORD
  if (!adminEmail || !adminPassword || !bidderPassword) throw new AppError("INTERNAL_ERROR")

  clock.setOffset(0)
  setCatalogTestState({ mode: "normal", missingIds: [] })
  const result = await resetDemo({ adminEmail, adminPassword, bidderPassword, log: () => undefined })
  return Response.json({ ok: true, ...result })
})
