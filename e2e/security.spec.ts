import { expect, test } from "@playwright/test"
import { BASE_URL, TOKEN_HEADER, apiAs, browserAs, createLot, db, findSeedLot, resetServer, USERS, visitorContext } from "./helpers"

// Regressões da auditoria: troca de papel, cabeçalhos de segurança, valores de depósito,
// saldo insuficiente, dinheiro em inglês e adulteração do estado do lote
test.beforeAll(async () => {
  await resetServer()
})

test.afterAll(async () => {
  await db.$disconnect()
})

test("licitante não consegue trocar o próprio papel pelo Better Auth", async () => {
  const bidder = await apiAs("bidder1")
  const auctioneerRole = await db.role.findUniqueOrThrow({ where: { name: "auctioneer" } })

  const response = await bidder.post("/api/auth/update-user", { headers: TOKEN_HEADER, data: { roleId: auctioneerRole.id } })
  expect(response.status()).toBe(404)

  const user = await db.user.findFirstOrThrow({ where: { email: USERS.bidder1.email }, include: { role: true } })
  expect(user.role.name).toBe("bidder")
  await bidder.dispose()
})

test("respostas trazem os cabeçalhos de segurança", async ({ request }) => {
  const response = await request.get(`${BASE_URL}/api/health`)
  const headers = response.headers()
  expect(headers["x-frame-options"]).toBe("DENY")
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'")
  expect(headers["x-content-type-options"]).toBe("nosniff")
  expect(headers["x-powered-by"]).toBeUndefined()
})

test("depósito com número de 3 casas é recusado (não vira milhar)", async () => {
  const bidder = await apiAs("bidder2")
  const response = await bidder.post("/api/wallet/deposits", { headers: TOKEN_HEADER, data: { amount: 12.345 } })
  expect(response.status()).toBe(422)
  expect((await response.json()).code).toBe("DEPOSIT_INVALID_AMOUNT")

  const ok = await bidder.post("/api/wallet/deposits", { headers: TOKEN_HEADER, data: { amount: 12.34 } })
  expect(ok.status()).toBe(201)
  expect((await ok.json()).wallet.totalCents).toBe(500_000 + 1234)
  await bidder.dispose()
})

test("lance acima do saldo é recusado na sala com o valor que falta", async ({ browser }) => {
  const admin = await apiAs("admin")
  const lot = await createLot(admin, "Giant Growth", { startingBidCents: 80_000, minIncrementCents: 100 })
  await admin.dispose()

  // bidder1 tem R$ 755,00 disponíveis depois do seed
  const context = await browserAs(browser, "bidder1")
  const page = await context.newPage()
  await page.goto(`/pt/lots/${lot.id}`)
  await expect(page.getByTestId("room-bid-submit")).toBeEnabled()
  await page.getByTestId("room-min-button").click()
  await page.getByTestId("room-bid-submit").click()
  await expect(page.getByTestId("room-bid-error")).toHaveText("Saldo insuficiente: faltam R$ 45,00.")
  await context.close()
})

test("em inglês, depósito aceita o formato 1,000.00", async ({ browser }) => {
  const context = await browserAs(browser, "bidder2")
  const page = await context.newPage()
  await page.goto("/en/wallet")
  await expect(page.getByTestId("deposit-submit")).toBeEnabled()
  const before = await db.wallet.findFirstOrThrow({ where: { user: { email: USERS.bidder2.email } } })

  await page.getByTestId("deposit-input").fill("1,000.00")
  await page.getByTestId("deposit-submit").click()
  await expect(page.getByTestId("toasts")).toContainText("deposited")

  const after = await db.wallet.findFirstOrThrow({ where: { user: { email: USERS.bidder2.email } } })
  expect(after.totalCents - before.totalCents).toBe(100_000)
  await context.close()
})

test("trocar o líder do lote direto no banco aparece como adulteração", async ({ browser }) => {
  const lotId = await findSeedLot("Black Lotus", "live")
  const lot = await db.lot.findUniqueOrThrow({ where: { id: lotId } })
  const other = await db.user.findFirstOrThrow({ where: { email: USERS.bidder2.email } })

  const context = await visitorContext(browser)
  const page = await context.newPage()
  await db.$executeRaw`UPDATE "e2e"."Lot" SET "leaderId" = ${other.id} WHERE "id" = ${lotId}`
  try {
    await page.goto(`/pt/lots/${lotId}/audit`)
    await expect(page.getByTestId("audit-seal")).toHaveAttribute("data-status", "TAMPERED")
    await expect(page.getByTestId("audit-problems")).toContainText("Líder, valor ou fim do lote diferente do registrado")
  } finally {
    await db.$executeRaw`UPDATE "e2e"."Lot" SET "leaderId" = ${lot.leaderId} WHERE "id" = ${lotId}`
  }
  await page.reload()
  await expect(page.getByTestId("audit-seal")).toHaveAttribute("data-status", "INTACT")
  await context.close()
})
