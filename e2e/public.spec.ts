import { expect, test } from "@playwright/test"
import { browserAs, findSeedLot, resetServer, visitorContext } from "./helpers"

// Vitrine, idiomas, permissões e páginas públicas com os dados do seed
test.beforeAll(async () => {
  await resetServer()
})

test("vitrine pública mostra o destaque e as seções do seed", async ({ browser }) => {
  const context = await visitorContext(browser)
  const page = await context.newPage()

  await page.goto("/")
  await expect(page).toHaveURL(/\/pt$/)
  // Destaque: o lote ao vivo que termina primeiro
  await expect(page.getByTestId("home-featured")).toContainText("Mox Sapphire")
  await expect(page.getByTestId("home-live").getByTestId("lot-card")).toHaveCount(2)
  await expect(page.getByTestId("home-scheduled")).toContainText("Time Walk")
  await expect(page.getByTestId("home-ended")).toContainText("Sol Ring")

  await page.goto("/pt/lots?tab=ended")
  await expect(page.getByTestId("showcase-grid").getByTestId("lot-card")).toHaveCount(2)
  await expect(page.getByTestId("showcase-grid")).toContainText("Sem lances")
  await context.close()
})

test("busca do topo leva à vitrine filtrada no servidor", async ({ browser }) => {
  const context = await visitorContext(browser)
  const page = await context.newPage()

  await page.goto("/pt")
  await page.getByTestId("nav-search").fill("lotus")
  await page.getByTestId("nav-search").press("Enter")
  await expect(page).toHaveURL(/\/pt\/lots\?q=lotus$/)
  await expect(page.getByTestId("showcase-search")).toHaveValue("lotus")
  await expect(page.getByTestId("showcase-grid").getByTestId("lot-card")).toHaveCount(1)
  await expect(page.getByTestId("showcase-grid")).toContainText("Black Lotus")

  // O campo da vitrine refaz a busca e mantém o termo na URL
  await page.getByTestId("showcase-search").fill("carta-que-nao-existe")
  await expect(page).toHaveURL(/q=carta-que-nao-existe/)
  await expect(page.getByTestId("empty-state")).toContainText("Nenhum lote encontrado")
  await page.getByTestId("showcase-search").fill("")
  await expect(page.getByTestId("showcase-grid").getByTestId("lot-card")).toHaveCount(2)
  await context.close()
})

test("interface em inglês e troca de idioma", async ({ browser }) => {
  const context = await visitorContext(browser)
  const page = await context.newPage()

  await page.goto("/en/lots")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Everything up for grabs")
  await page.getByTestId("lang-switch").click()
  await expect(page).toHaveURL(/\/pt\/lots/)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tudo o que está em disputa")
  await context.close()
})

test("visitante é mandado para o login nas áreas logadas", async ({ browser }) => {
  const context = await visitorContext(browser)
  const page = await context.newPage()

  await page.goto("/pt/wallet")
  await expect(page).toHaveURL(/\/pt\/login\?next=%2Fwallet/)
  await expect(page.getByTestId("login-form")).toBeVisible()
  await context.close()
})

test("licitante não acessa o painel e leiloeiro não dá lance", async ({ browser }) => {
  const bidder = await browserAs(browser, "bidder1")
  const bidderPage = await bidder.newPage()
  await bidderPage.goto("/pt/dashboard")
  await expect(bidderPage.getByTestId("empty-state")).toContainText("Esta área é do leiloeiro.")
  await bidder.close()

  const lotId = await findSeedLot("Mox Sapphire", "live")
  const admin = await browserAs(browser, "admin")
  const adminPage = await admin.newPage()
  await adminPage.goto(`/pt/lots/${lotId}`)
  await expect(adminPage.getByTestId("room-banner")).toContainText("Este lote é seu")
  await expect(adminPage.getByTestId("room-bid-submit")).toHaveCount(0)
  await admin.close()
})

test("comprovante e auditoria abrem sem login e sem dados pessoais", async ({ browser }) => {
  const lotId = await findSeedLot("Sol Ring", "ended")
  const context = await visitorContext(browser)
  const page = await context.newPage()

  await page.goto(`/pt/lots/${lotId}`)
  await expect(page.getByTestId("room-result")).toContainText("Lote arrematado")
  await page.getByTestId("room-receipt-link").click()
  await expect(page.getByTestId("receipt-code")).toHaveText(/^[2-9A-HJKMNP-Z]{12}$/)
  await expect(page.getByTestId("receipt-final")).toHaveText("R$ 95,00")
  await expect(page.getByTestId("receipt")).not.toContainText("@")

  await page.goto(`/pt/lots/${lotId}/audit`)
  await expect(page.getByTestId("audit-seal")).toHaveAttribute("data-status", "INTACT")
  await expect(page.getByTestId("audit-table")).toContainText("Licitante")
  await context.close()
})

test("URL inexistente mostra o 404 do design", async ({ browser }) => {
  const context = await visitorContext(browser)
  const page = await context.newPage()
  const response = await page.goto("/pt/nao-existe")
  expect(response?.status()).toBe(404)
  await expect(page.getByTestId("empty-state")).toContainText("Página não encontrada")
  await context.close()
})

test("apresentação abre sem login e sem verificação anti-bot, com o vídeo", async ({ browser }) => {
  // Contexto sem o passe de leitura: a página é estática e não pode cair na verificação
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto("/apresentacao")
  await expect(page).toHaveURL(/\/pt\/apresentacao$/)
  await expect(page.getByRole("heading", { level: 1 })).toContainText("casa de leilões")
  const video = page.getByTestId("presentation-video")
  await expect(video).toBeVisible()
  const response = await page.request.get("/apresentacao/cardrush-apresentacao.mp4", { headers: { range: "bytes=0-1023" } })
  expect([200, 206]).toContain(response.status())

  await page.goto("/en/apresentacao")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("auction house")
  await context.close()
})
