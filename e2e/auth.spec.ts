import { expect, test } from "@playwright/test"
import { USERS, resetServer, visitorContext } from "./helpers"

// Cadastro com papel, login e logout (com Turnstile invisível de verdade, chave de teste)
test.beforeAll(async () => {
  await resetServer()
})

test("cadastro de licitante leva à carteira já logado", async ({ browser }) => {
  const context = await visitorContext(browser)
  const page = await context.newPage()
  const email = `novo-${Date.now()}@teste.cardrush.com`

  await page.goto("/pt/signup")
  // Espera hidratar: digitar antes disso se perde no input controlado
  await expect(page.getByTestId("signup-submit")).toBeEnabled()
  await page.getByTestId("role-bidder").click()
  await page.getByLabel("Nome de exibição").fill("Pessoa Nova")
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha").fill("senha-forte-123")
  await page.getByTestId("signup-submit").click()

  await expect(page).toHaveURL(/\/pt\/wallet/)
  await expect(page.getByTestId("nav-user")).toHaveText("Pessoa Nova")
  await expect(page.getByTestId("wallet-total")).toHaveText("R$ 0,00")

  // O mesmo e-mail (com maiúsculas) é recusado
  await page.getByTestId("nav-logout").click()
  // Espera o logout terminar antes de navegar (senão a saída pode ser abortada)
  await expect(page.getByTestId("nav-login")).toBeVisible()
  await page.goto("/pt/signup")
  await expect(page.getByTestId("signup-submit")).toBeEnabled()
  await page.getByLabel("Nome de exibição").fill("Outra")
  await page.getByLabel("E-mail").fill(email.toUpperCase())
  await page.getByLabel("Senha").fill("senha-forte-123")
  await page.getByTestId("signup-submit").click()
  await expect(page.getByTestId("signup-email-error")).toHaveText("Já existe uma conta com este e-mail.")
  await context.close()
})

test("login com senha errada mostra erro e login certo volta para a página pedida", async ({ browser }) => {
  const context = await visitorContext(browser)
  const page = await context.newPage()

  await page.goto("/pt/my-bids")
  await expect(page).toHaveURL(/\/pt\/login\?next=%2Fmy-bids/)
  await expect(page.getByTestId("login-submit")).toBeEnabled()

  await page.getByLabel("E-mail").fill(USERS.bidder1.email)
  await page.getByLabel("Senha").fill("senha-errada")
  await page.getByTestId("login-submit").click()
  await expect(page.getByTestId("login-error")).toHaveText("E-mail ou senha incorretos.")

  await page.getByLabel("Senha").fill(USERS.bidder1.password)
  await page.getByTestId("login-submit").click()
  await expect(page).toHaveURL(/\/pt\/my-bids/)
  await expect(page.getByTestId("my-bids")).toContainText("Black Lotus")
  await context.close()
})
