import { testOnly } from "@/lib/test-mode"
import { closeDueLots } from "@/server/settlement"

// POST /api/test/run-closer — roda a varredura de liquidação na hora
export const POST = testOnly(async () => Response.json(await closeDueLots()))
