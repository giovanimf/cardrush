import { z } from "zod"
import { env } from "@/lib/env"
import { AppError } from "@/lib/errors"
import type { CatalogSource } from "@/server/catalog/types"

// Modos simulados da fonte, para os testes (F3.4). Só valem com TEST_MODE=1.
export const CATALOG_TEST_MODES = ["normal", "down", "rate_limited", "no_image", "no_title"] as const

export const catalogTestStateSchema = z.object({
  mode: z.enum(CATALOG_TEST_MODES).default("normal"),
  // Ids que a fonte passa a tratar como "sumidos"
  missingIds: z.array(z.string().min(1)).default([]),
})

export type CatalogTestState = z.infer<typeof catalogTestStateSchema>

const SIMULATED_RETRY_AFTER_SEC = 30

// Estado no globalThis: vale para todos os módulos do processo
const store = globalThis as unknown as { catalogTestState?: CatalogTestState }

export function getCatalogTestState(): CatalogTestState {
  return store.catalogTestState ?? { mode: "normal", missingIds: [] }
}

export function setCatalogTestState(state: CatalogTestState) {
  if (!env.TEST_MODE) throw new Error("Modos simulados do catálogo só funcionam com TEST_MODE=1")
  store.catalogTestState = state
}

// Embrulha a fonte real aplicando o modo atual. Fora do modo de teste, devolve a fonte intacta.
export function withTestModes(source: CatalogSource): CatalogSource {
  if (!env.TEST_MODE) return source

  function failIfUnavailable() {
    const { mode } = getCatalogTestState()
    if (mode === "down") throw new AppError("SEARCH_UNAVAILABLE")
    if (mode === "rate_limited") throw new AppError("SEARCH_RATE_LIMITED", { retryAfterSec: SIMULATED_RETRY_AFTER_SEC })
  }

  function degrade<T extends { imageUrl: string | null; title: string | null }>(item: T): T {
    const { mode } = getCatalogTestState()
    if (mode === "no_image") return { ...item, imageUrl: null }
    if (mode === "no_title") return { ...item, title: null }
    return item
  }

  return {
    async search(query) {
      failIfUnavailable()
      const missing = new Set(getCatalogTestState().missingIds)
      const items = await source.search(query)
      return items.filter((item) => !missing.has(item.sourceId)).map(degrade)
    },

    async getById(sourceId) {
      failIfUnavailable()
      if (getCatalogTestState().missingIds.includes(sourceId)) return null
      const item = await source.getById(sourceId)
      return item && degrade(item)
    },
  }
}
