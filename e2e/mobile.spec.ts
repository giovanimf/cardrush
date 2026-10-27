import { devices, expect, test } from "@playwright/test"
import { browserAs, findSeedLot, resetServer } from "./helpers"

// Celular: barra de abas embaixo e formulário de lance fixo acima dela
test.use({ ...devices["Pixel 7"] })

test.beforeAll(async () => {
  await resetServer()
})

test("no celular a navegação vai para a barra de abas e o lance fica acessível", async ({ browser }) => {
  const lotId = await findSeedLot("Mox Sapphire", "live")
  const context = await browserAs(browser, "bidder1")
  const page = await context.newPage()
  // browserAs cria o contexto à mão (não herda o dispositivo do test.use): tamanho de celular aqui
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto(`/pt/lots/${lotId}`)
  await expect(page.locator(".tabbar")).toBeVisible()
  await expect(page.locator(".subnav")).toBeHidden()

  const submit = page.getByTestId("room-bid-submit")
  await expect(submit).toBeVisible()
  const box = await submit.boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(44)

  await page.locator(".tabbar").getByText("Carteira").click()
  await expect(page).toHaveURL(/\/pt\/wallet/)
  await context.close()
})
