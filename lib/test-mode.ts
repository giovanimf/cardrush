import { env } from "@/lib/env"
import { AppError, toErrorResponse } from "@/lib/errors"

// Rotas de teste (F10.2): só existem com TEST_MODE=1; fora dele respondem 404 como se não existissem
export function testOnly(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    if (!env.TEST_MODE) return toErrorResponse(new AppError("NOT_FOUND"))
    try {
      return await handler(request)
    } catch (error) {
      return toErrorResponse(error)
    }
  }
}
