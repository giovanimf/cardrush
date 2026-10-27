import { clock } from "@/lib/clock"
import { AppError } from "@/lib/errors"
import { readJsonObject } from "@/lib/http"
import { testOnly } from "@/lib/test-mode"

// POST /api/test/clock { now?: ISO, advanceMs?: number, reset?: true } — controla o relógio do servidor
export const POST = testOnly(async (request) => {
  const body = await readJsonObject(request)

  if (body.reset === true) {
    clock.setOffset(0)
  } else if (typeof body.now === "string") {
    const target = Date.parse(body.now)
    if (Number.isNaN(target)) throw new AppError("VALIDATION_FAILED", { fields: { now: ["INVALID_DATE"] } })
    clock.setOffset(target - Date.now())
  } else if (typeof body.advanceMs === "number" && Number.isFinite(body.advanceMs)) {
    clock.setOffset(clock.getOffset() + body.advanceMs)
  } else {
    throw new AppError("VALIDATION_FAILED", { fields: { body: ["NOW_ADVANCE_OR_RESET"] } })
  }

  return Response.json({ now: clock.now().toISOString(), offsetMs: clock.getOffset() })
})

export const GET = testOnly(async () => Response.json({ now: clock.now().toISOString(), offsetMs: clock.getOffset() }))
