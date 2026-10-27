import "dotenv/config"
import { expect, request, type APIRequestContext, type Browser, type BrowserContext } from "@playwright/test"
import { PrismaClient } from "@prisma/client"

export const BASE_URL = "http://localhost:3100"
// Com a secret de teste da Cloudflare, qualquer token passa
export const TOKEN_HEADER = { "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX" }

export type Who = "admin" | "bidder1" | "bidder2"

export const USERS: Record<Who, { email: string; password: string }> = {
  admin: { email: process.env.SEED_EMAIL!, password: process.env.SEED_PASSWORD! },
  bidder1: { email: "marina.costa@cardrush.com", password: process.env.SEED_BIDDER_PASSWORD! },
  bidder2: { email: "rafael.lima@cardrush.com", password: process.env.SEED_BIDDER_PASSWORD! },
}

// Banco dos testes, para adulterar a auditoria por SQL como um atacante faria
export const db = new PrismaClient({ datasourceUrl: process.env.E2E_DATABASE_URL })

async function newApi(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { origin: BASE_URL } })
}

// Passe de leitura (cookie ts_pass): vale 4 min no relógio do servidor
export async function refreshPass(api: APIRequestContext) {
  const response = await api.post("/api/turnstile/verify", { headers: TOKEN_HEADER })
  expect(response.status()).toBe(200)
}

export async function resetServer() {
  const api = await newApi()
  const response = await api.post("/api/test/reset", { timeout: 180_000 })
  expect(response.status(), await response.text()).toBe(200)
  await api.dispose()
}

export async function setClock(body: { advanceMs?: number; reset?: true }) {
  const api = await newApi()
  const response = await api.post("/api/test/clock", { data: body })
  expect(response.status()).toBe(200)
  await api.dispose()
}

export async function setCatalogMode(mode: "normal" | "down" | "rate_limited" | "no_image" | "no_title") {
  const api = await newApi()
  expect((await api.post("/api/test/catalog", { data: { mode, missingIds: [] } })).status()).toBe(200)
  await api.dispose()
}

export async function runCloser() {
  const api = await newApi()
  const response = await api.post("/api/test/run-closer")
  expect(response.status()).toBe(200)
  const summary = await response.json()
  await api.dispose()
  return summary
}

// Sessão pela API (passe + login com token Turnstile)
export async function apiAs(who: Who): Promise<APIRequestContext> {
  const api = await newApi()
  await refreshPass(api)
  const response = await api.post("/api/auth/sign-in/email", { headers: TOKEN_HEADER, data: USERS[who] })
  expect(response.status(), await response.text()).toBe(200)
  return api
}

// Navegador já logado (reaproveita os cookies da API)
export async function browserAs(browser: Browser, who: Who): Promise<BrowserContext> {
  const api = await apiAs(who)
  const context = await browser.newContext({ storageState: await api.storageState() })
  await api.dispose()
  return context
}

// Navegador de visitante já com o passe de leitura
export async function visitorContext(browser: Browser): Promise<BrowserContext> {
  const api = await newApi()
  await refreshPass(api)
  const context = await browser.newContext({ storageState: await api.storageState() })
  await api.dispose()
  return context
}

// Cria um lote pelo leiloeiro do seed, com uma carta buscada pelo nome exato
export async function createLot(
  admin: APIRequestContext,
  cardName: string,
  options: { startingBidCents?: number; minIncrementCents?: number; endsInMs?: number } = {},
): Promise<{ id: string; title: string }> {
  await refreshPass(admin)
  const search = await admin.get(`/api/catalog/search?q=${encodeURIComponent(`!"${cardName}"`)}`)
  expect(search.status(), await search.text()).toBe(200)
  const { items } = await search.json()
  expect(items.length).toBeGreaterThan(0)

  const clock = await (await admin.get("/api/test/clock")).json()
  const response = await admin.post("/api/lots", {
    headers: TOKEN_HEADER,
    data: {
      sourceItemId: items[0].sourceId,
      startingBidCents: options.startingBidCents ?? 1000,
      minIncrementCents: options.minIncrementCents ?? 100,
      endsAt: new Date(Date.parse(clock.now) + (options.endsInMs ?? 10 * 60_000)).toISOString(),
    },
  })
  expect(response.status(), await response.text()).toBe(201)
  const { lot } = await response.json()
  return { id: lot.id, title: lot.title }
}

export async function bidViaApi(api: APIRequestContext, lotId: string, amountCents: number) {
  const response = await api.post(`/api/lots/${lotId}/bids`, { headers: TOKEN_HEADER, data: { amountCents } })
  expect(response.status(), await response.text()).toBe(201)
  return response.json()
}

// Lote encerrado do seed pelo título
export async function findSeedLot(title: string, tab: "live" | "scheduled" | "ended"): Promise<string> {
  const api = await newApi()
  await refreshPass(api)
  const { items } = await (await api.get(`/api/lots?tab=${tab}`)).json()
  await api.dispose()
  const lot = items.find((item: { title: string }) => item.title === title)
  expect(lot, `lote ${title} na aba ${tab}`).toBeTruthy()
  return lot.id
}

// Dá o lance mínimo pela sala e espera o resultado; se a tela mostrar erro, o teste falha com ele
export async function placeMinimumBid(page: import("@playwright/test").Page) {
  await page.getByTestId("room-min-button").click()
  await page.getByTestId("room-bid-submit").click()
  const accepted = page.getByTestId("room-banner").and(page.locator('[data-position="leading"]'))
  const error = page.getByTestId("room-bid-error")
  await expect(accepted.or(error)).toBeVisible()
  if (await error.isVisible()) throw new Error(`Lance recusado na tela: ${await error.textContent()}`)
}
