import { expect, test as setup, type Page } from "@playwright/test"
import { browserAs, resetServer, visitorContext } from "./helpers"

// O next dev compila cada rota na primeira visita. Abre todas as telas uma vez (e espera hidratar)
// antes dos testes, para a compilação não estourar o tempo de nenhum teste.
setup.setTimeout(300_000)

// A primeira compilação pode recarregar a página no meio (Fast Refresh): tenta de novo
async function visit(page: Page, path: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(path, { timeout: 180_000 })
      return
    } catch (error) {
      if (attempt === 3) throw error
    }
  }
}

setup("aquecer as rotas", async ({ browser }) => {
  // Garante as contas do seed atual no banco dos testes antes do primeiro login
  await resetServer()
  const visitor = await visitorContext(browser)
  const page = await visitor.newPage()
  for (const path of ["/pt", "/pt/lots", "/pt/login", "/pt/signup", "/pt/verify", "/pt/lots/x", "/pt/lots/x/audit", "/pt/receipts/x"]) {
    await visit(page, path)
  }
  await visit(page, "/pt/login")
  await expect(page.getByTestId("login-submit")).toBeEnabled({ timeout: 180_000 })
  await visitor.close()

  const admin = await browserAs(browser, "admin")
  const adminPage = await admin.newPage()
  for (const path of ["/pt/dashboard", "/pt/dashboard/new"]) await visit(adminPage, path)
  await expect(adminPage.getByTestId("catalog-search")).toBeEnabled({ timeout: 180_000 })
  await admin.close()

  const bidder = await browserAs(browser, "bidder1")
  const bidderPage = await bidder.newPage()
  for (const path of ["/pt/my-bids", "/pt/wallet"]) await visit(bidderPage, path)
  await expect(bidderPage.getByTestId("deposit-submit")).toBeEnabled({ timeout: 180_000 })
  await bidder.close()
})
