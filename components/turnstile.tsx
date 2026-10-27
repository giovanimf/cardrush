"use client"

import { createContext, useCallback, useContext, useEffect } from "react"

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
// Mesmo nome do cabeçalho/campo validado no servidor (server/security)
export const TURNSTILE_TOKEN_FIELD = "cf-turnstile-response"
// Tempo máximo para obter um token antes de desistir
const TOKEN_TIMEOUT_MS = 30_000
// Renova antes dos 4 min do passe
const PASS_REFRESH_MS = 3 * 60 * 1000

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)

  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile não carregou")))
    script.onerror = () => {
      scriptPromise = null
      script.remove()
      reject(new Error("Turnstile não carregou"))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

// Resolve um desafio invisível e devolve um token novo (cada token vale para uma escrita)
export async function getTurnstileToken(siteKey: string): Promise<string> {
  const turnstile = await loadTurnstile()
  // Normalmente o widget invisível não mostra nada. Se a Cloudflare pedir interação, ele
  // aparece fixo no rodapé da tela (e não perdido no fim da página).
  const container = document.createElement("div")
  Object.assign(container.style, { position: "fixed", left: "50%", bottom: "96px", transform: "translateX(-50%)", zIndex: "90" })
  document.body.appendChild(container)

  return new Promise<string>((resolve, reject) => {
    let settled = false
    // Os callbacks chegam depois do render, quando widgetId já existe
    const finish = (action: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      action()
      turnstile.remove(widgetId)
      container.remove()
    }
    // Sem resposta em 30 s (desafio abandonado, rede presa): desiste em vez de travar o envio
    const timeout = window.setTimeout(() => finish(() => reject(new Error("Verificação Turnstile sem resposta"))), TOKEN_TIMEOUT_MS)

    const widgetId = turnstile.render(container, {
      sitekey: siteKey,
      theme: "auto",
      callback: (token: string) => finish(() => resolve(token)),
      "error-callback": () => finish(() => reject(new Error("Verificação Turnstile falhou"))),
      "timeout-callback": () => finish(() => reject(new Error("Verificação Turnstile expirou"))),
    })
  })
}

// Troca um token por um passe de leitura (cookie ts_pass)
export async function refreshReadPass(siteKey: string): Promise<void> {
  const token = await getTurnstileToken(siteKey)
  const response = await fetch("/api/turnstile/verify", {
    method: "POST",
    headers: { [TURNSTILE_TOKEN_FIELD]: token },
  })

  if (!response.ok) throw new Error("Passe de leitura recusado")
}

const SiteKeyContext = createContext<string | null>(null)

// Disponibiliza a site key e mantém o passe de leitura renovado enquanto a página está aberta
export function TurnstileProvider({ siteKey, children }: { siteKey: string; children: React.ReactNode }) {
  useEffect(() => {
    const interval = window.setInterval(() => {
      refreshReadPass(siteKey).catch(() => {
        // Sem passe novo, a próxima leitura cai na página de verificação
      })
    }, PASS_REFRESH_MS)

    return () => window.clearInterval(interval)
  }, [siteKey])

  return <SiteKeyContext.Provider value={siteKey}>{children}</SiteKeyContext.Provider>
}

// Uso em formulários: const getToken = useTurnstileToken(); headers: { [TURNSTILE_TOKEN_FIELD]: await getToken() }
export function useTurnstileToken() {
  const siteKey = useContext(SiteKeyContext)

  return useCallback(() => {
    if (!siteKey) throw new Error("TurnstileProvider ausente")
    return getTurnstileToken(siteKey)
  }, [siteKey])
}

export function useTurnstileSiteKey() {
  const siteKey = useContext(SiteKeyContext)
  if (!siteKey) throw new Error("TurnstileProvider ausente")
  return siteKey
}
