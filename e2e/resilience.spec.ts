import { expect, request, test } from "@playwright/test"
import { BASE_URL, TOKEN_HEADER, apiAs, browserAs, db, findSeedLot, resetServer, setCatalogMode, visitorContext } from "./helpers"

// Auditoria adulterada por SQL, Scryfall fora do ar e Turnstile
test.beforeAll(async () => {
  await resetServer()
})

test.afterAll(async () => {
  await setCatalogMode("normal")
  await db.$disconnect()
})

test("UPDATE direto no valor de um lance faz a auditoria mostrar Adulterado a partir daquele lance", async ({ browser }) => {
  const lotId = await findSeedLot("Sol Ring", "ended")
  const context = await visitorContext(browser)
  const page = await context.newPage()

  await page.goto(`/pt/lots/${lotId}/audit`)
  await expect(page.getByTestId("audit-seal")).toHaveAttribute("data-status", "INTACT")

  const bid = await db.bid.findFirstOrThrow({ where: { lotId, seq: 2 } })
  const auditSeq = (await db.auditEntry.findMany({ where: { lotId, type: "BID" }, orderBy: { seq: "asc" } }))[1].seq
  await db.$executeRaw`UPDATE "e2e"."Bid" SET "amountCents" = 1 WHERE "id" = ${bid.id}`

  try {
    await page.reload()
    await expect(page.getByTestId("audit-seal")).toHaveAttribute("data-status", "TAMPERED")
    await expect(page.getByTestId("audit-seal")).toContainText(`a partir do registro #${auditSeq}`)
    await expect(page.getByTestId("audit-table").locator("tr.bad").first()).toContainText(`#${auditSeq}`)
  } finally {
    await db.$executeRaw`UPDATE "e2e"."Bid" SET "amountCents" = ${bid.amountCents} WHERE "id" = ${bid.id}`
  }

  await page.reload()
  await expect(page.getByTestId("audit-seal")).toHaveAttribute("data-status", "INTACT")
  await context.close()
})

test("com a Scryfall fora, a busca avisa e oferece as cartas consultadas; a vitrine segue normal", async ({ browser }) => {
  const context = await browserAs(browser, "admin")
  const page = await context.newPage()

  await page.goto("/pt/dashboard/new")
  // Espera hidratar: digitar antes disso se perde no input controlado
  await expect(page.getByTestId("catalog-search")).toBeEnabled()
  await page.getByTestId("catalog-query").fill("lightning bolt")
  await page.getByTestId("catalog-search").click()
  await expect(page.getByTestId("catalog-item").first()).toBeVisible()

  await setCatalogMode("down")
  await page.getByTestId("catalog-query").fill("lightning")
  await page.getByTestId("catalog-search").click()
  await expect(page.getByTestId("catalog-down")).toContainText("indisponível")
  await page.getByRole("button", { name: "Escolher", exact: true }).first().click()
  await expect(page.getByTestId("new-lot")).toHaveAttribute("data-step", "1")

  // Vitrine e salas não dependem da Scryfall (cópia da carta no lote)
  await page.goto("/pt/lots")
  await expect(page.getByTestId("showcase-grid").getByTestId("lot-card").first()).toBeVisible()
  await setCatalogMode("normal")
  await context.close()
})

test("leiloeiro cria um lote pelo assistente e cancela antes de qualquer lance", async ({ browser }) => {
  const context = await browserAs(browser, "admin")
  const page = await context.newPage()

  await page.goto("/pt/dashboard/new")
  // Espera hidratar: digitar antes disso se perde no input controlado
  await expect(page.getByTestId("catalog-search")).toBeEnabled()
  await page.getByTestId("catalog-query").fill('!"Llanowar Elves"')
  await page.getByTestId("catalog-search").click()
  await page.getByTestId("catalog-choose").first().click()
  await page.getByTestId("lot-starting-bid").fill("15,00")
  await page.getByTestId("lot-increment").fill("1,00")
  await page.getByTestId("lot-to-review").click()
  await page.getByTestId("lot-publish").click()
  await expect(page.getByTestId("room")).toHaveAttribute("data-state", "live")

  await page.goto("/pt/dashboard")
  const row = page.locator('[data-testid="dashboard-row"]', { hasText: "Llanowar Elves" })
  await row.getByTestId("cancel-lot").click()
  await page.getByTestId("confirm-cancel").click()
  await expect(row).toHaveAttribute("data-state", "cancelled")
  await context.close()
})

test("Turnstile: escrita sem token e leitura sem passe são recusadas; o navegador passa sozinho", async ({ browser }) => {
  const bidder = await apiAs("bidder1")
  const noToken = await bidder.post("/api/wallet/deposits", { data: { amount: "10,00" } })
  expect(noToken.status()).toBe(403)
  expect((await noToken.json()).data.reason).toBe("TOKEN_MISSING")
  const withToken = await bidder.post("/api/wallet/deposits", { headers: TOKEN_HEADER, data: { amount: "10,00" } })
  expect(withToken.status()).toBe(201)
  await bidder.dispose()

  const anonymous = await request.newContext({ baseURL: BASE_URL })
  const read = await anonymous.get("/api/lots")
  expect(read.status()).toBe(403)
  expect((await read.json()).data.reason).toBe("PASS_MISSING")
  await anonymous.dispose()

  // Navegador sem passe: a página de verificação resolve o desafio invisível e recarrega
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto("/pt/lots")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tudo o que está em disputa", { timeout: 30_000 })
  await context.close()
})
