import { expect, test } from "@playwright/test"
import { apiAs, bidViaApi, browserAs, createLot, placeMinimumBid, resetServer, runCloser, setClock, visitorContext } from "./helpers"

const MINUTE = 60_000

// Depósito, lance e recusa, tempo real com dois navegadores, prorrogação, encerramento e comprovante
test.beforeAll(async () => {
  await resetServer()
})

test.afterEach(async () => {
  await setClock({ reset: true })
})

test("depósito, lance abaixo do mínimo recusado e lance aceito", async ({ browser }) => {
  const admin = await apiAs("admin")
  const lot = await createLot(admin, "Lightning Bolt", { startingBidCents: 1000, minIncrementCents: 100 })

  const context = await browserAs(browser, "bidder2")
  const page = await context.newPage()

  // bidder2 começa com 5.000,00 de total
  await page.goto("/pt/wallet")
  await expect(page.getByTestId("wallet-total")).toHaveText("R$ 5.000,00")
  await expect(page.getByTestId("deposit-submit")).toBeEnabled()
  await page.getByTestId("deposit-input").fill("100,00")
  await page.getByTestId("deposit-submit").click()
  await expect(page.getByTestId("wallet-total")).toHaveText("R$ 5.100,00")
  await expect(page.getByTestId("wallet-statement")).toContainText("Depósito simulado")

  await page.goto(`/pt/lots/${lot.id}`)
  await expect(page.getByTestId("room-minimum")).toHaveText("R$ 10,00")
  await page.getByTestId("room-bid-input").fill("9,00")
  await page.getByTestId("room-bid-submit").click()
  await expect(page.getByTestId("room-bid-error")).toHaveText("Seu lance precisa ser de pelo menos R$ 10,00.")

  await page.getByTestId("room-min-button").click()
  await page.getByTestId("room-bid-submit").click()
  await expect(page.getByTestId("room-banner")).toHaveAttribute("data-position", "leading")
  await expect(page.getByTestId("room-current-bid")).toHaveText("R$ 10,00")
  await expect(page.getByTestId("room-bid-submit")).toBeDisabled()
  await context.close()
  await admin.dispose()
})

test("tempo real: o lance de um navegador aparece no outro sem recarregar", async ({ browser }) => {
  const admin = await apiAs("admin")
  const lot = await createLot(admin, "Counterspell", { startingBidCents: 2000, minIncrementCents: 100 })

  const first = await browserAs(browser, "bidder1")
  const second = await browserAs(browser, "bidder2")
  const visitor = await visitorContext(browser)
  const page1 = await first.newPage()
  const page2 = await second.newPage()
  const visitorPage = await visitor.newPage()

  await Promise.all([page1.goto(`/pt/lots/${lot.id}`), page2.goto(`/pt/lots/${lot.id}`), visitorPage.goto(`/pt/lots/${lot.id}`)])

  // bidder1 dá o primeiro lance
  await placeMinimumBid(page1)

  // bidder2 vê em até ~2 s (polling logado) e cobre
  await expect(page2.getByTestId("room-bid-count")).toHaveText("1", { timeout: 5_000 })
  await placeMinimumBid(page2)

  // bidder1 vira "superado" sozinho, com toast; o visitante (5 s) também vê
  await expect(page1.getByTestId("room-banner")).toHaveAttribute("data-position", "outbid", { timeout: 5_000 })
  await expect(page1.getByTestId("toasts")).toContainText("Você foi superado")
  await expect(page1.getByTestId("room-history")).toContainText("Você")
  await expect(visitorPage.getByTestId("room-current-bid")).toHaveText("R$ 21,00", { timeout: 8_000 })

  await Promise.all([first.close(), second.close(), visitor.close()])
  await admin.dispose()
})

test("prorrogação, encerramento, comprovante e meus arremates", async ({ browser }) => {
  const admin = await apiAs("admin")
  const bidder1 = await apiAs("bidder1")
  const lot = await createLot(admin, "Dark Ritual", { startingBidCents: 500, minIncrementCents: 100, endsInMs: 6 * MINUTE })
  await bidViaApi(bidder1, lot.id, 500)

  // Faltando 1:30, o lance prorroga 2 min
  await setClock({ advanceMs: 4.5 * MINUTE })
  const context = await browserAs(browser, "bidder2")
  const page = await context.newPage()
  await page.goto(`/pt/lots/${lot.id}`)
  await placeMinimumBid(page)
  await expect(page.getByTestId("room-extended")).toHaveText("+2 min")
  await expect(page.getByTestId("toasts")).toContainText("Lance aceito")

  // Passa do fim: a varredura fecha e a sala mostra o resultado
  await setClock({ advanceMs: 10 * MINUTE })
  await runCloser()
  await page.reload()
  await expect(page.getByTestId("room")).toHaveAttribute("data-state", "closed")
  await expect(page.getByTestId("room-result")).toContainText("Você venceu este lote!")

  await page.getByTestId("room-receipt-link").click()
  await expect(page.getByTestId("receipt-final")).toHaveText("R$ 6,00")
  const receiptUrl = page.url()

  // Comprovante abre para qualquer pessoa
  const visitor = await visitorContext(browser)
  const visitorPage = await visitor.newPage()
  await visitorPage.goto(receiptUrl)
  await expect(visitorPage.getByTestId("receipt-final")).toHaveText("R$ 6,00")

  // O extrato mostra o débito do arremate
  await page.goto("/pt/wallet")
  await expect(page.locator('[data-testid="wallet-statement"] tr[data-type="SETTLEMENT_DEBIT"]').first()).toBeVisible()

  await page.goto("/pt/my-bids")
  await page.getByRole("tab", { name: /Histórico/ }).click()
  // Adiantar o relógio também fechou os lotes dos testes anteriores: filtra pelo lote deste teste
  await expect(page.locator('[data-testid="my-bid-item"][data-status="won"]', { hasText: "Dark Ritual" })).toBeVisible()

  await Promise.all([context.close(), visitor.close()])
  await Promise.all([admin.dispose(), bidder1.dispose()])
})
