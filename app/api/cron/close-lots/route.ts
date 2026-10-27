import { timingSafeEqual } from "node:crypto"
import { env } from "@/lib/env"
import { AppError, toErrorResponse } from "@/lib/errors"
import { closeDueLots } from "@/server/settlement"

// Gatilho externo da liquidação: Authorization: Bearer <CRON_SECRET>.
// GET e POST, porque os serviços de cron variam no método.
function isAuthorized(request: Request): boolean {
  const received = Buffer.from(request.headers.get("authorization") ?? "")
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`)
  return received.length === expected.length && timingSafeEqual(received, expected)
}

async function handle(request: Request) {
  try {
    if (!isAuthorized(request)) throw new AppError("FORBIDDEN")
    return Response.json(await closeDueLots())
  } catch (error) {
    return toErrorResponse(error)
  }
}

export const GET = handle
export const POST = handle
