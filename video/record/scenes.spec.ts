import { expect, test, type Browser, type BrowserContext } from "@playwright/test"
import { USERS, apiAs, browserAs, createLot, db, findSeedLot, resetServer, runCloser, setClock, visitorContext } from "../../e2e/helpers"
import { Recorder, prepareContext } from "./recorder"

// Roteiro do vídeo de apresentação: cada teste grava uma cena em video/public/clips.
// As cenas rodam em ordem e compartilham o estado (a conta nova e o lote disputado).

const MINUTE = 60_000
const DESKTOP = { width: 1440, height: 810 }
// 1440 × 810 com escala 4/3 dá quadros de 1920 × 1080
const DESKTOP_SCALE = 4 / 3
const SPLIT = { width: 900, height: 1000 }

const NEW_USER = { name: "Lucas Andrade", email: "lucas.andrade@exemplo.com", password: "senha-forte-123" }

test.describe.configure({ mode: "serial" })

let lucasState: Awaited<ReturnType<BrowserContext["storageState"]>>
let lot: { id: string; title: string }

test.beforeAll(async () => {
  await resetServer()
})

test.afterAll(async () => {
  await setClock({ reset: true })
  await db.$disconnect()
})

async function desktop(context: BrowserContext | Promise<BrowserContext>) {
  const ready = await context
  await prepareContext(ready)
  return ready
}

// Contextos com tamanho e escala fixos (browserAs/visitorContext não recebem opções)
async function visitor(browser: Browser, options: Parameters<Browser["newContext"]>[0] = {}) {
  const base = await visitorContext(browser)
  const state = await base.storageState()
  await base.close()
  return desktop(browser.newContext({ viewport: DESKTOP, deviceScaleFactor: DESKTOP_SCALE, locale: "pt-BR", ...options, storageState: state }))
}

async function as(browser: Browser, who: Parameters<typeof browserAs>[1], options: Parameters<Browser["newContext"]>[0] = {}) {
  const base = await browserAs(browser, who)
  const state = await base.storageState()
  await base.close()
  return desktop(browser.newContext({ viewport: DESKTOP, deviceScaleFactor: DESKTOP_SCALE, locale: "pt-BR", ...options, storageState: state }))
}

test("01 vitrine e busca", async ({ browser }) => {
  const context = await visitor(browser)
  const page = await context.newPage()
  await page.goto("/pt")
  await expect(page.getByTestId("home-featured")).toBeVisible()
  await page.waitForLoadState("networkidle")

  const rec = new Recorder(page, "01-vitrine")
  await rec.start()
  await rec.pause(1800)
  await rec.moveTo(page.getByTestId("home-featured"), 900)
  await rec.pause(900)
  await rec.scroll(620, 1400)
  await rec.pause(1400)
  await rec.scroll(700, 1400)
  await rec.pause(1400)
  await rec.scroll(-1320, 1200)
  await rec.pause(500)
  await rec.type(page.getByTestId("nav-search"), "lotus", { delay: 110 })
  await rec.press("Enter")
  await expect(page.getByTestId("showcase-grid").getByTestId("lot-card")).toHaveCount(1)
  await rec.pause(900)
  await rec.moveTo(page.getByTestId("lot-card").first(), 900)
  await rec.pause(2200)
  await rec.stop()
  await context.close()
})

test("02 cadastro e depósito", async ({ browser }) => {
  const context = await visitor(browser)
  const page = await context.newPage()
  await page.goto("/pt/signup")
  await expect(page.getByTestId("signup-submit")).toBeEnabled()

  const rec = new Recorder(page, "02-cadastro")
  await rec.start()
  await rec.pause(1200)
  await rec.click(page.getByTestId("role-bidder"), { after: 600 })
  await rec.type(page.getByLabel("Nome de exibição"), NEW_USER.name)
  await rec.type(page.getByLabel("E-mail"), NEW_USER.email, { delay: 45 })
  await rec.type(page.getByLabel("Senha"), NEW_USER.password, { delay: 45 })
  await rec.click(page.getByTestId("signup-submit"))
  await expect(page).toHaveURL(/\/pt\/wallet/)
  await expect(page.getByTestId("wallet-total")).toHaveText("R$ 0,00")
  await expect(page.getByTestId("deposit-submit")).toBeEnabled()
  rec.mark("carteira")
  await rec.pause(1600)
  await rec.type(page.getByTestId("deposit-input"), "500,00", { delay: 120 })
  await rec.click(page.getByTestId("deposit-submit"))
  await expect(page.getByTestId("wallet-total")).toHaveText("R$ 500,00")
  await rec.moveTo(page.getByTestId("balance-chip"), 900)
  await rec.pause(1500)
  await rec.moveTo(page.getByTestId("wallet-statement"), 900)
  await rec.pause(2200)
  await rec.stop()

  lucasState = await context.storageState()
  await context.close()
})

test("03 disputa em tempo real e prorrogação", async ({ browser }) => {
  const admin = await apiAs("admin")
  lot = await createLot(admin, "Shivan Dragon", { startingBidCents: 12_000, minIncrementCents: 1_000, endsInMs: 10 * MINUTE })
  await admin.dispose()

  const lucas = await desktop(browser.newContext({ viewport: SPLIT, deviceScaleFactor: 1, locale: "pt-BR", storageState: lucasState }))
  const marina = await as(browser, "bidder1", { viewport: SPLIT, deviceScaleFactor: 1 })
  const left = await lucas.newPage()
  const right = await marina.newPage()
  await Promise.all([left.goto(`/pt/lots/${lot.id}`), right.goto(`/pt/lots/${lot.id}`)])
  await Promise.all([expect(left.getByTestId("room-bid-submit")).toBeEnabled(), expect(right.getByTestId("room-bid-submit")).toBeEnabled()])

  const recLeft = new Recorder(left, "03-disputa-lucas")
  const recRight = new Recorder(right, "03-disputa-marina")
  await Promise.all([recLeft.start(), recRight.start()])
  await recLeft.pause(1800)

  // Lucas dá o lance mínimo
  await recLeft.click(left.getByTestId("room-min-button"), { after: 500 })
  await recLeft.click(left.getByTestId("room-bid-submit"))
  await expect(left.getByTestId("room-banner")).toHaveAttribute("data-position", "leading")
  recLeft.mark("lucas-lidera")

  // Marina vê o lance chegar sozinho e cobre
  await expect(right.getByTestId("room-bid-count")).toHaveText("1", { timeout: 8_000 })
  recRight.mark("marina-ve")
  await recRight.pause(1200)
  await recRight.click(right.getByTestId("room-min-button"), { after: 500 })
  await recRight.click(right.getByTestId("room-bid-submit"))
  await expect(right.getByTestId("room-banner")).toHaveAttribute("data-position", "leading")

  // Lucas é avisado de que foi superado
  await expect(left.getByTestId("room-banner")).toHaveAttribute("data-position", "outbid", { timeout: 8_000 })
  recLeft.mark("lucas-superado")
  await recLeft.pause(2500)

  // Faltando 1:30, o lance prorroga o lote em 2 minutos
  await setClock({ advanceMs: 8.5 * MINUTE })
  await expect(left.getByTestId("room-timer")).toHaveClass(/hot/, { timeout: 10_000 })
  recLeft.mark("reta-final")
  await recLeft.pause(1500)
  await recLeft.type(left.getByTestId("room-bid-input"), "150,00", { clear: true, delay: 120 })
  await recLeft.click(left.getByTestId("room-bid-submit"))
  await expect(left.getByTestId("room-extended")).toHaveText("+2 min")
  recLeft.mark("prorrogado")
  await expect(right.getByTestId("room-banner")).toHaveAttribute("data-position", "outbid", { timeout: 8_000 })
  await recLeft.pause(3000)

  await Promise.all([recLeft.stop(), recRight.stop()])
  lucasState = await lucas.storageState()
  await Promise.all([lucas.close(), marina.close()])
})

test("04 encerramento e comprovante", async ({ browser }) => {
  const context = await desktop(browser.newContext({ viewport: DESKTOP, deviceScaleFactor: DESKTOP_SCALE, locale: "pt-BR", storageState: lucasState }))
  const page = await context.newPage()
  await page.goto(`/pt/lots/${lot.id}`)
  await expect(page.getByTestId("room")).toHaveAttribute("data-state", "live")

  const rec = new Recorder(page, "04-encerramento")
  await rec.start()
  await rec.pause(1500)
  // O tempo acaba: a varredura liquida o lote e a sala mostra o resultado sozinha
  await setClock({ advanceMs: 10 * MINUTE })
  await runCloser()
  await expect(page.getByTestId("room")).toHaveAttribute("data-state", "closed", { timeout: 15_000 })
  rec.mark("encerrado")
  await rec.moveTo(page.getByTestId("room-result"), 900)
  await rec.pause(2500)
  await rec.click(page.getByTestId("room-receipt-link"))
  await expect(page.getByTestId("receipt-final")).toHaveText("R$ 150,00")
  rec.mark("comprovante")
  await rec.pause(1800)
  await rec.moveTo(page.getByTestId("receipt-final"), 800)
  await rec.pause(1200)
  await rec.scroll(450, 1000)
  await rec.pause(2200)
  await rec.stop()
  await context.close()
})

test("05 meus arremates e extrato", async ({ browser }) => {
  const context = await desktop(browser.newContext({ viewport: DESKTOP, deviceScaleFactor: DESKTOP_SCALE, locale: "pt-BR", storageState: lucasState }))
  const page = await context.newPage()
  await page.goto("/pt/my-bids")
  await expect(page.getByTestId("my-bids")).toBeVisible()

  const rec = new Recorder(page, "05-arremates")
  await rec.start()
  await rec.pause(1200)
  await rec.click(page.getByRole("tab", { name: /Histórico/ }))
  const won = page.locator('[data-testid="my-bid-item"][data-status="won"]', { hasText: lot.title })
  await expect(won).toBeVisible()
  await rec.moveTo(won, 800)
  await rec.pause(2000)
  await rec.click(page.locator(".subnav").getByRole("link", { name: "Carteira" }))
  await expect(page.locator('[data-testid="wallet-statement"] tr[data-type="SETTLEMENT_DEBIT"]').first()).toBeVisible()
  rec.mark("extrato")
  await rec.moveTo(page.locator('[data-testid="wallet-statement"] tr[data-type="SETTLEMENT_DEBIT"]').first(), 900)
  await rec.pause(2500)
  await rec.stop()
  await context.close()
})

test("06 auditoria pública", async ({ browser }) => {
  const context = await visitor(browser)
  const page = await context.newPage()
  await page.goto(`/pt/lots/${lot.id}/audit`)
  await expect(page.getByTestId("audit-seal")).toHaveAttribute("data-status", "INTACT")

  const rec = new Recorder(page, "06-auditoria")
  await rec.start()
  await rec.pause(1200)
  await rec.moveTo(page.getByTestId("audit-seal"), 900)
  await rec.pause(2000)
  await rec.scroll(420, 1000)
  await rec.moveTo(page.getByTestId("audit-table"), 900)
  await rec.pause(1800)

  // Um "atacante" altera o valor de um lance direto no banco
  const bid = await db.bid.findFirstOrThrow({ where: { lotId: lot.id, seq: 2 } })
  await db.$executeRaw`UPDATE "e2e"."Bid" SET "amountCents" = 100 WHERE "id" = ${bid.id}`
  try {
    rec.mark("adulterado")
    await rec.scroll(-420, 600)
    await page.reload()
    await expect(page.getByTestId("audit-seal")).toHaveAttribute("data-status", "TAMPERED")
    await rec.pause(800)
    await rec.moveTo(page.getByTestId("audit-seal"), 800)
    await rec.pause(2200)
    await rec.scroll(420, 1000)
    await rec.moveTo(page.getByTestId("audit-table").locator("tr.bad").first(), 900)
    await rec.pause(2500)
    await rec.stop()
  } finally {
    await db.$executeRaw`UPDATE "e2e"."Bid" SET "amountCents" = ${bid.amountCents} WHERE "id" = ${bid.id}`
  }
  await context.close()
})

test("07 leiloeiro cria um lote", async ({ browser }) => {
  await setClock({ reset: true })
  const context = await visitor(browser)
  const page = await context.newPage()
  await page.goto("/pt/login")
  await expect(page.getByTestId("login-submit")).toBeEnabled()

  const rec = new Recorder(page, "07-leiloeiro")
  await rec.start()
  await rec.pause(1000)
  await rec.type(page.getByLabel("E-mail"), USERS.admin.email, { delay: 40 })
  await rec.type(page.getByLabel("Senha"), USERS.admin.password, { delay: 40 })
  await rec.click(page.getByTestId("login-submit"))
  await expect(page.getByTestId("nav-user")).toBeVisible()
  await rec.click(page.locator(".subnav").getByRole("link", { name: "Painel" }))
  await expect(page.getByTestId("new-lot-button")).toBeVisible()
  rec.mark("painel")
  await rec.pause(1800)
  await rec.click(page.getByTestId("new-lot-button"))
  await expect(page.getByTestId("catalog-search")).toBeEnabled()
  rec.mark("assistente")
  await rec.type(page.getByTestId("catalog-query"), "serra angel", { delay: 90 })
  await rec.click(page.getByTestId("catalog-search"))
  await expect(page.getByTestId("catalog-item").first()).toBeVisible()
  await rec.pause(1600)
  await rec.click(page.getByTestId("catalog-choose").first(), { after: 900 })
  await rec.type(page.getByTestId("lot-starting-bid"), "80,00", { clear: true, delay: 110 })
  await rec.type(page.getByTestId("lot-increment"), "5,00", { clear: true, delay: 110 })
  await rec.click(page.getByTestId("lot-to-review"), { after: 1600 })
  await rec.click(page.getByTestId("lot-publish"))
  await expect(page.getByTestId("room")).toHaveAttribute("data-state", "live")
  rec.mark("publicado")
  await rec.pause(2800)
  await rec.stop()
  await context.close()
})

test("08 tema escuro e idioma", async ({ browser }) => {
  const context = await visitor(browser, { colorScheme: "light" })
  await context.addInitScript(() => {
    try {
      if (!sessionStorage.getItem("rec-theme")) {
        localStorage.setItem("cardrush-theme", "light")
        sessionStorage.setItem("rec-theme", "1")
      }
    } catch {}
  })
  const page = await context.newPage()
  await page.goto("/pt/lots")
  await expect(page.getByTestId("theme-switch")).toBeEnabled()
  await expect(page.getByTestId("showcase-grid")).toBeVisible()

  const rec = new Recorder(page, "08-tema")
  await rec.start()
  await rec.pause(1500)
  await rec.click(page.getByTestId("theme-switch"), { after: 300 })
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  rec.mark("escuro")
  await rec.pause(1500)
  await rec.scroll(380, 1000)
  await rec.pause(1200)
  await rec.scroll(-380, 800)
  await rec.click(page.getByTestId("lang-switch").locator("visible=true"))
  await expect(page).toHaveURL(/\/en\/lots/)
  rec.mark("ingles")
  await rec.pause(2600)
  await rec.stop()
  await context.close()
})

test("09 celular", async ({ browser }) => {
  const lotId = await findSeedLot("Mox Sapphire", "live")
  const context = await as(browser, "bidder1", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  await page.goto(`/pt/lots/${lotId}`)
  await expect(page.getByTestId("room-bid-submit")).toBeVisible()

  const rec = new Recorder(page, "09-celular")
  await rec.start()
  await rec.pause(1800)
  // O formulário de lance gruda acima das abas quando a coluna do preço aparece
  await rec.scrollTo(560, 1600)
  rec.mark("lance")
  await rec.pause(1200)
  await rec.tap(page.getByTestId("room-min-button"), { after: 1400 })
  await rec.scrollTo(1100, 1400)
  await rec.pause(800)
  rec.mark("abas")
  await rec.tap(page.locator(".tabbar").getByText("Carteira"))
  await expect(page).toHaveURL(/\/pt\/wallet/)
  await rec.pause(2000)
  await rec.tap(page.locator(".tabbar").getByText("Leilões"))
  await expect(page.getByTestId("showcase-grid")).toBeVisible()
  await rec.pause(2200)
  await rec.stop()
  await context.close()
})
