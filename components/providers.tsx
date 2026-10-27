"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { getDictionary, INTL_LOCALE, type Dictionary, type Locale } from "@/lib/i18n"
import { ApiError, useApi } from "@/lib/client/api"
import { parseMoneyToCents } from "@/lib/money"

// ---------- i18n ----------

type I18n = {
  locale: Locale
  t: Dictionary
  money: (cents: number) => string
  dateTime: (iso: string) => string
  time: (iso: string) => string
  shortDate: (iso: string) => string
  // Caminho com o idioma atual: href("/lots") → /pt/lots
  href: (path: string) => string
  // Mensagem traduzida pelo código do erro (nunca pela mensagem do servidor)
  errorText: (error: unknown) => string
  // Valor digitado no formato do idioma → centavos (null se inválido)
  parseMoney: (text: string) => number | null
  // Centavos → texto para campo de valor, sem símbolo ("4.850,00" / "4,850.00")
  plainMoney: (cents: number) => string
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo<I18n>(() => {
    const t = getDictionary(locale)
    const intl = INTL_LOCALE[locale]
    const moneyFormat = new Intl.NumberFormat(intl, { style: "currency", currency: "BRL" })
    const dateTimeFormat = new Intl.DateTimeFormat(intl, { dateStyle: "short", timeStyle: "medium" })
    const timeFormat = new Intl.DateTimeFormat(intl, { timeStyle: "medium" })
    const shortDateFormat = new Intl.DateTimeFormat(intl, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    const money = (cents: number) => moneyFormat.format(cents / 100)

    return {
      locale,
      t,
      money,
      dateTime: (iso) => dateTimeFormat.format(new Date(iso)),
      time: (iso) => timeFormat.format(new Date(iso)),
      shortDate: (iso) => shortDateFormat.format(new Date(iso)),
      href: (path) => `/${locale}${path === "/" ? "" : path}`,
      parseMoney: (text) => parseMoneyToCents(text, locale),
      plainMoney: (cents) => (cents / 100).toLocaleString(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      errorText: (error) => {
        const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR"
        const entry = t.errors[code] ?? t.errors.INTERNAL_ERROR
        return typeof entry === "function" ? entry(error instanceof ApiError ? (error.data ?? {}) : {}, money) : entry
      },
    }
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error("I18nProvider ausente")
  return value
}

// ---------- sessão ----------

export type SessionUser = { id: string; name: string; role: string; permissions: string[] }
export type WalletSummary = { totalCents: number; committedCents: number; availableCents: number }

type Session = {
  user: SessionUser | null
  wallet: WalletSummary | null
  loading: boolean
  can: (permission: string) => boolean
  refresh: () => Promise<void>
}

const SessionContext = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { get } = useApi()
  const [state, setState] = useState<{ user: SessionUser | null; wallet: WalletSummary | null; loading: boolean }>({
    user: null,
    wallet: null,
    loading: true,
  })

  const load = useCallback(
    () => get<{ user: SessionUser | null; wallet: WalletSummary | null }>("/api/me").catch(() => null),
    [get],
  )
  const apply = useCallback((me: { user: SessionUser | null; wallet: WalletSummary | null } | null) => {
    setState((current) => (me ? { user: me.user, wallet: me.wallet, loading: false } : { ...current, loading: false }))
  }, [])

  const refresh = useCallback(async () => {
    apply(await load())
  }, [load, apply])

  useEffect(() => {
    void load().then(apply)
  }, [load, apply])

  const value = useMemo<Session>(
    () => ({ ...state, can: (permission) => !!state.user?.permissions.includes(permission), refresh }),
    [state, refresh],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): Session {
  const value = useContext(SessionContext)
  if (!value) throw new Error("SessionProvider ausente")
  return value
}

// ---------- toasts ----------

type Toast = { id: number; title: string; text?: string; tone?: "ok" | "bad" }
type ToastApi = { show: (toast: Omit<Toast, "id">) => void }

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const show = useCallback((toast: Omit<Toast, "id">) => {
    const id = nextId.current++
    setToasts((current) => [...current.slice(-2), { ...toast, id }])
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 5000)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite" data-testid="toasts">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.tone === "bad" ? "bad" : ""}`} role="status">
            <div>
              <b>{toast.title}</b>
              {toast.text && (
                <>
                  <br />
                  {toast.text}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext)
  if (!value) throw new Error("ToastProvider ausente")
  return value
}
