import { AppError } from "@/lib/errors"
import { RULES } from "@/lib/rules"
import { normalizeScryfallCard, type ScryfallCard } from "@/server/catalog/rules"
import type { CatalogItem, CatalogSource } from "@/server/catalog/types"

const BASE_URL = "https://api.scryfall.com"
// A Scryfall pede cabeçalhos de identificação em toda chamada
const HEADERS = {
  "User-Agent": "CardRush/0.1",
  Accept: "application/json;q=0.9,*/*;q=0.8",
}
// Quantas cartas a busca devolve (a primeira página da Scryfall tem até 175)
const SEARCH_LIMIT = 24
// Espera sugerida quando a Scryfall responde 429 sem Retry-After
const DEFAULT_RETRY_AFTER_SEC = 10

// Fila global: no mínimo 100 ms entre o início de duas chamadas (BR-CAT-01).
// Usa performance.now(), não o clock: é ritmo real de rede, não regra de negócio.
const queueState = globalThis as unknown as {
  scryfallQueue?: Promise<void>
  scryfallLastCallAt?: number
  scryfallPending?: number
  scryfallCache?: Map<string, { items: CatalogItem[]; expiresAt: number }>
}

// Fila com profundidade máxima: com muita busca acumulada, recusa na hora (SEARCH_RATE_LIMITED)
// em vez de deixar todo mundo esperando atrás de uma fila sem fim
const MAX_PENDING = 20
// Busca repetida em pouco tempo reaproveita o resultado (não ocupa a fila)
const SEARCH_CACHE_MS = 60_000
const SEARCH_CACHE_MAX = 200

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  if ((queueState.scryfallPending ?? 0) >= MAX_PENDING) {
    return Promise.reject(new AppError("SEARCH_RATE_LIMITED", { retryAfterSec: Math.ceil((MAX_PENDING * RULES.SCRYFALL_MIN_INTERVAL_MS) / 1000) }))
  }
  queueState.scryfallPending = (queueState.scryfallPending ?? 0) + 1

  const turn = (queueState.scryfallQueue ?? Promise.resolve()).then(async () => {
    const waitMs = (queueState.scryfallLastCallAt ?? -Infinity) + RULES.SCRYFALL_MIN_INTERVAL_MS - performance.now()
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs))
    queueState.scryfallLastCallAt = performance.now()
  })

  queueState.scryfallQueue = turn
  return turn.then(task).finally(() => {
    queueState.scryfallPending = (queueState.scryfallPending ?? 1) - 1
  })
}

async function request(path: string): Promise<Response> {
  return enqueue(async () => {
    try {
      return await fetch(`${BASE_URL}${path}`, {
        headers: HEADERS,
        cache: "no-store",
        signal: AbortSignal.timeout(RULES.SCRYFALL_TIMEOUT_MS),
      })
    } catch {
      // Rede ou timeout (BR-CAT-02)
      throw new AppError("SEARCH_UNAVAILABLE")
    }
  })
}

function retryAfterSec(response: Response): number {
  const value = Number(response.headers.get("retry-after"))
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : DEFAULT_RETRY_AFTER_SEC
}

// Erros comuns às duas chamadas; 404/400 ficam com quem chama
function assertUsable(response: Response) {
  if (response.status === 429) throw new AppError("SEARCH_RATE_LIMITED", { retryAfterSec: retryAfterSec(response) })
  if (!response.ok) throw new AppError("SEARCH_UNAVAILABLE")
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T
  } catch {
    throw new AppError("SEARCH_UNAVAILABLE")
  }
}

export function createScryfallClient(): CatalogSource {
  return {
    async search(query: string): Promise<CatalogItem[]> {
      const cache = (queueState.scryfallCache ??= new Map())
      const key = query.trim().toLowerCase()
      const cached = cache.get(key)
      if (cached && cached.expiresAt > performance.now()) return cached.items

      const items = await searchRemote(query)
      if (cache.size >= SEARCH_CACHE_MAX) cache.delete(cache.keys().next().value!)
      cache.set(key, { items, expiresAt: performance.now() + SEARCH_CACHE_MS })
      return items
    },

    async getById(sourceId: string): Promise<CatalogItem | null> {
      return getRemote(sourceId)
    },
  }
}

async function searchRemote(query: string): Promise<CatalogItem[]> {
  const params = new URLSearchParams({ q: query, unique: "cards", order: "name" })
  const response = await request(`/cards/search?${params}`)

  // 404 = nenhuma carta; 400 = consulta que a Scryfall não entende. Os dois viram lista vazia.
  if (response.status === 404 || response.status === 400) return []
  assertUsable(response)

  const body = await readJson<{ data?: ScryfallCard[] }>(response)
  return (body.data ?? []).slice(0, SEARCH_LIMIT).map(normalizeScryfallCard)
}

async function getRemote(sourceId: string): Promise<CatalogItem | null> {
  const response = await request(`/cards/${encodeURIComponent(sourceId)}`)

  if (response.status === 404 || response.status === 400) return null
  assertUsable(response)

  return normalizeScryfallCard(await readJson<ScryfallCard>(response))
}
