"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { getTurnstileToken, refreshReadPass, TURNSTILE_TOKEN_FIELD, useTurnstileSiteKey } from "@/components/turnstile"

// Erro da API no formato { code, message, data }. NETWORK = sem resposta do servidor.
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly data?: Record<string, unknown>,
  ) {
    super(code)
    this.name = "ApiError"
  }
}

type RequestOptions = { method?: string; body?: unknown; token?: string; headers?: Record<string, string> }

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
        ...(options.token ? { [TURNSTILE_TOKEN_FIELD]: options.token } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      credentials: "same-origin",
    })
  } catch {
    throw new ApiError("NETWORK", 0)
  }

  const json = (await response.json().catch(() => null)) as { code?: string; data?: Record<string, unknown> } | null
  if (!response.ok) throw new ApiError(json?.code ?? "INTERNAL_ERROR", response.status, json?.data)
  return json as T
}

// Leituras renovam o passe sozinhas se ele venceu (aba parada); escritas pedem um token novo
export function useApi() {
  const siteKey = useTurnstileSiteKey()

  const get = useCallback(
    async <T,>(path: string): Promise<T> => {
      try {
        return await request<T>(path)
      } catch (error) {
        if (error instanceof ApiError && error.code === "TURNSTILE_FAILED") {
          await refreshReadPass(siteKey).catch(() => undefined)
          return request<T>(path)
        }
        throw error
      }
    },
    [siteKey],
  )

  const send = useCallback(
    async <T,>(path: string, body?: unknown, options: { method?: string; headers?: Record<string, string> } = {}): Promise<T> => {
      let token: string
      try {
        token = await getTurnstileToken(siteKey)
      } catch {
        throw new ApiError("TURNSTILE_FAILED", 403)
      }
      return request<T>(path, { method: options.method ?? "POST", body, token, headers: options.headers })
    },
    [siteKey],
  )

  // Token avulso, para chamadas que não passam por aqui (login do Better Auth)
  const token = useCallback(() => getTurnstileToken(siteKey), [siteKey])

  return { get, send, token }
}

type Polled<T> = {
  data: T | null
  error: ApiError | null
  loading: boolean
  // false quando a última consulta falhou por rede ou servidor (mostra "Reconectando…")
  connected: boolean
  refresh: () => Promise<void>
  setData: (data: T) => void
}

// Consulta periódica (F9.4). intervalMs null = só uma vez. A aba em segundo plano pausa;
// ao voltar, busca na hora. stop(data) = true encerra as consultas (ex.: lote fechado).
export function usePolled<T>(path: string | null, intervalMs: number | null, stop?: (data: T) => boolean): Polled<T> {
  const { get } = useApi()
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(true)
  // Caminho em andamento (cada caminho tem a sua busca; trocar de aba não espera a anterior)
  const inFlight = useRef<string | null>(null)
  const currentPath = useRef(path)
  // Sobe a cada setData (ex.: resposta de um lance): consulta que começou antes é descartada
  const version = useRef(0)
  const latest = useRef<T | null>(null)
  const stopRef = useRef(stop)
  useEffect(() => {
    stopRef.current = stop
    currentPath.current = path
  })

  // Busca sem tocar no estado; apply aplica o resultado (separados para o efeito só mudar
  // o estado no callback da promessa)
  type Result = ({ data: T } | { error: ApiError }) & { path: string; version: number }

  const load = useCallback(async (): Promise<Result | null> => {
    if (!path || inFlight.current === path) return null
    inFlight.current = path
    const startedAt = { path, version: version.current }
    try {
      return { data: await get<T>(path), ...startedAt }
    } catch (caught) {
      return { error: caught instanceof ApiError ? caught : new ApiError("INTERNAL_ERROR", 500), ...startedAt }
    } finally {
      if (inFlight.current === path) inFlight.current = null
    }
  }, [get, path])

  const apply = useCallback((result: Result | null) => {
    if (!result) return
    // Resposta velha: de outro caminho (aba/página trocada) ou anterior a um setData mais novo
    if (result.path !== currentPath.current || result.version !== version.current) return
    if ("data" in result) {
      latest.current = result.data
      setData(result.data)
      setError(null)
      setConnected(true)
    } else {
      setError(result.error)
      setConnected(!(result.error.code === "NETWORK" || result.error.status >= 500))
    }
    setLoading(false)
  }, [])

  const refresh = useCallback(async () => {
    apply(await load())
  }, [load, apply])

  useEffect(() => {
    if (!path) return
    // Primeira busca e cada ciclo disparam a promessa; o estado só muda na resposta
    void load().then(apply)
    if (!intervalMs) return

    const shouldPoll = () =>
      document.visibilityState === "visible" && !(latest.current && stopRef.current?.(latest.current))
    const timer = window.setInterval(() => {
      if (shouldPoll()) void load().then(apply)
    }, intervalMs)
    const onVisible = () => {
      if (shouldPoll()) void load().then(apply)
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [path, intervalMs, load, apply])

  const replace = useCallback((next: T) => {
    version.current += 1
    latest.current = next
    setData(next)
  }, [])

  return { data, error, loading, connected, refresh, setData: replace }
}

// Relógio do navegador corrigido pelo servidor (F9.5): guarda a diferença e conta sozinho.
// Começa null (a renderização no servidor não pode ler a hora) e passa a contar ao montar.
export function useServerNow(serverNowIso: string | null | undefined, tickMs = 1000): number | null {
  const offset = useRef(0)
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    if (serverNowIso) offset.current = Date.parse(serverNowIso) - Date.now()
  }, [serverNowIso])

  useEffect(() => {
    const tick = () => setNow(Date.now() + offset.current)
    const first = window.setTimeout(tick, 0)
    const timer = window.setInterval(tick, tickMs)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [tickMs])

  return now
}

// true depois da hidratação: botões de envio ficam desabilitados antes, para um clique
// precoce não virar submit nativo do formulário
const noopSubscribe = () => () => {}
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}

// Chave de idempotência por envio (um clique duplo manda a mesma chave)
export function newIdempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
