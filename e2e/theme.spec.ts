import { expect, request, test, type Browser, type Page } from "@playwright/test"
import { BASE_URL, apiAs, refreshPass, resetServer } from "./helpers"

// Tema: segue o sistema, a chave alterna Sistema → Claro → Escuro e a escolha fica salva sem piscar
const LIGHT_BG = "rgb(242, 245, 251)"
const DARK_BG = "rgb(10, 20, 48)"

test.beforeAll(async () => {
  await resetServer()
})

async function visitor(browser: Browser, colorScheme: "light" | "dark") {
  const api = await request.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { origin: BASE_URL } })
  await refreshPass(api)
  const context = await browser.newContext({ storageState: await api.storageState(), colorScheme })
  await api.dispose()
  // data-theme no fim do parse do HTML: mostra o que o script do <head> aplicou antes do React
  await context.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      ;(window as unknown as { __themeAtParse: string | null }).__themeAtParse = document.documentElement.getAttribute("data-theme")
    })
  })
  return context
}

// Repete até estabilizar: o next dev pode recarregar a página na primeira compilação da rota
const expectBg = (page: Page, bg: string) =>
  expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor).catch(() => null)).toBe(bg)

test("sem escolha, o tema segue o sistema", async ({ browser }) => {
  for (const [scheme, bg] of [["light", LIGHT_BG], ["dark", DARK_BG]] as const) {
    const context = await visitor(browser, scheme)
    const page = await context.newPage()
    await page.goto("/pt")
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/)
    await expectBg(page, bg)
    await context.close()
  }
})

test("a chave alterna Sistema → Claro → Escuro e a escolha vale depois de recarregar", async ({ browser }) => {
  const context = await visitor(browser, "dark")
  const page = await context.newPage()
  await page.goto("/pt/lots")

  const toggle = page.getByTestId("theme-switch")
  await expect(toggle).toHaveAccessibleName("Tema: Sistema. Mudar para Claro")
  await expect(toggle).toBeEnabled()

  // Sistema escuro, escolha "Claro": vale a escolha
  await toggle.click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  await expect(toggle).toHaveAccessibleName("Tema: Claro. Mudar para Escuro")
  await expectBg(page, LIGHT_BG)

  await page.reload()
  expect(await page.evaluate(() => (window as unknown as { __themeAtParse: string | null }).__themeAtParse)).toBe("light")
  await expectBg(page, LIGHT_BG)
  await expect(toggle).toBeEnabled()

  await toggle.click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await expectBg(page, DARK_BG)

  // Volta para "Sistema": tira a escolha salva
  await toggle.click()
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/)
  expect(await page.evaluate(() => localStorage.getItem("cardrush-theme"))).toBeNull()
  await context.close()
})

test("a escolha salva também vale em página logada e na troca de idioma", async ({ browser }) => {
  const api = await apiAs("bidder1")
  const context = await browser.newContext({ storageState: await api.storageState(), colorScheme: "light" })
  await api.dispose()
  await context.addInitScript(() => {
    try {
      localStorage.setItem("cardrush-theme", "dark")
    } catch {}
  })
  const page = await context.newPage()

  await page.goto("/pt/wallet")
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await expectBg(page, DARK_BG)
  await expect(page.getByTestId("theme-switch")).toHaveAccessibleName("Tema: Escuro. Mudar para Sistema")

  await page.getByTestId("lang-switch").click()
  await expect(page).toHaveURL(/\/en\/wallet/)
  // Trocar de idioma troca o layout raiz; o Next guarda o anterior escondido, por isso :visible
  await expect(page.getByTestId("theme-switch").locator("visible=true")).toHaveAccessibleName("Theme: Dark. Switch to System")
  await expectBg(page, DARK_BG)
  await context.close()
})
