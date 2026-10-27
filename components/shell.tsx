"use client"

import Link from "next/link"
import { Suspense, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { LOCALES, type Locale } from "@/lib/i18n"
import { useI18n, useSession } from "@/components/providers"
import { ThemeSwitch } from "@/components/theme-switch"

// Caminho atual sem o prefixo do idioma: /pt/lots/x → /lots/x
function usePathWithoutLocale(): string {
  const pathname = usePathname() ?? "/"
  const [, , ...rest] = pathname.split("/")
  return `/${rest.join("/")}`
}

function useNavItems() {
  const { t } = useI18n()
  const { can } = useSession()

  return [
    { path: "/", label: t.nav.home, icon: "home", show: true },
    { path: "/lots", label: t.nav.lots, icon: "lots", show: true },
    { path: "/#how", label: t.nav.howItWorks, icon: "help", show: true, desktopOnly: true },
    { path: "/wallet", label: t.nav.wallet, icon: "wallet", show: can("wallet.view") },
    { path: "/my-bids", label: t.nav.myBids, icon: "bids", show: can("bids.view_own") },
    { path: "/dashboard", label: t.nav.dashboard, icon: "dashboard", show: can("lot.view_own") },
  ].filter((item) => item.show)
}

function isActive(current: string, path: string): boolean {
  if (path === "/") return current === "/"
  if (path.startsWith("/#")) return false
  return current === path || current.startsWith(`${path}/`)
}

function LanguageSwitch() {
  const { t, locale } = useI18n()
  const path = usePathWithoutLocale()
  const router = useRouter()
  const other = LOCALES.find((item) => item !== locale) as Locale

  return (
    <button
      className="lang-switch"
      aria-label={t.nav.switchLanguageLabel}
      data-testid="lang-switch"
      onClick={() => {
        document.cookie = `lang=${other}; path=/; max-age=31536000; samesite=lax`
        router.push(`/${other}${path === "/" ? "" : path}${window.location.search}`)
      }}
    >
      {t.nav.switchLanguage}
    </button>
  )
}

// Busca do topo: leva para a vitrine com ?q= (a vitrine filtra no servidor).
// Campo não controlado num form GET: o que foi digitado antes da hidratação não se perde,
// e sem JavaScript o navegador envia o form sozinho para /lots?q=.
function SearchBox() {
  const { t, href } = useI18n()
  const router = useRouter()
  const path = usePathWithoutLocale()
  const params = useSearchParams()
  const urlQuery = path === "/lots" ? (params.get("q") ?? "") : ""

  return (
    <form
      className="search"
      role="search"
      action={href("/lots")}
      onSubmit={(event) => {
        event.preventDefault()
        const query = String(new FormData(event.currentTarget).get("q") ?? "").trim()
        router.push(href(query ? `/lots?q=${encodeURIComponent(query)}` : "/lots"))
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        // key: quando a URL muda (ex.: busca pela vitrine), o campo recomeça com o termo dela
        key={urlQuery}
        type="search"
        name="q"
        defaultValue={urlQuery}
        placeholder={t.nav.searchPlaceholder}
        aria-label={t.nav.searchPlaceholder}
        maxLength={80}
        data-testid="nav-search"
      />
    </form>
  )
}

export function TopBar() {
  const { t, money, href } = useI18n()
  const { user, wallet, loading, refresh } = useSession()
  const router = useRouter()

  async function logout() {
    await authClient.signOut()
    await refresh()
    router.push(href("/"))
    router.refresh()
  }

  return (
    <header className="topbar">
      <div className="wrap bar">
        <Link className="logo" href={href("/")}>
          Card<b>Rush</b>
        </Link>
        <Suspense fallback={<div className="search" />}>
          <SearchBox />
        </Suspense>
        <div className="actions">
          <ThemeSwitch />
          <Suspense fallback={null}>
            <LanguageSwitch />
          </Suspense>
          {!loading && !user && (
            <>
              <Link className="btn btn-ghost btn-sm" href={href("/login")} data-testid="nav-login">
                {t.nav.login}
              </Link>
              <Link className="btn btn-gold btn-sm hide-mobile" href={href("/signup")}>
                {t.nav.signup}
              </Link>
            </>
          )}
          {user && (
            <>
              {wallet && (
                <Link className="balance-chip" href={href("/wallet")} data-testid="balance-chip">
                  <span className="hide-mobile">{t.nav.balance}</span>
                  <b>{money(wallet.availableCents)}</b>
                </Link>
              )}
              <span className="hide-mobile" style={{ color: "var(--on-ink-muted)", fontSize: 13 }} data-testid="nav-user">
                {user.name}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={logout} data-testid="nav-logout">
                {t.nav.logout}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export function SubNav() {
  const { href } = useI18n()
  const current = usePathWithoutLocale()
  const items = useNavItems()

  return (
    <nav className="subnav">
      <div className="wrap">
        {items.map((item) => (
          <Link key={item.path} href={href(item.path)} className={isActive(current, item.path) ? "active" : ""}>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  lots: <path d="M4 5h16v14H4zM4 10h16M9 5v14" />,
  wallet: <path d="M3 7h18v12H3zM16 13h2M3 7l3-3h12" />,
  bids: <path d="M14 3l7 7-4 4-7-7zM10 7l-7 7 4 4 7-7M3 21h10" />,
  dashboard: <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />,
  account: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />,
}

// Barra de abas fixa embaixo no celular (FE.3)
export function TabBar() {
  const { t, href } = useI18n()
  const { user } = useSession()
  const current = usePathWithoutLocale()
  const items = useNavItems().filter((item) => !("desktopOnly" in item && item.desktopOnly))
  const all = user ? items : [...items, { path: "/login", label: t.nav.account, icon: "account", show: true }]

  return (
    <nav className="tabbar" aria-label={t.nav.mobileNav}>
      {all.map((item) => (
        <Link key={item.path} href={href(item.path)} className={isActive(current, item.path) ? "active" : ""}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            {ICONS[item.icon]}
          </svg>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

export function Footer() {
  const { t, href } = useI18n()

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="cols">
          <div>
            <div className="logo" style={{ color: "var(--cream)", fontSize: 22 }}>
              Card<b>Rush</b>
            </div>
            <p style={{ maxWidth: 260, marginTop: 12 }}>{t.footer.tagline}</p>
          </div>
          <div>
            <h4>{t.footer.lots}</h4>
            <Link href={href("/lots?tab=live")}>{t.footer.live}</Link>
            <Link href={href("/lots?tab=scheduled")}>{t.footer.scheduled}</Link>
            <Link href={href("/lots?tab=ended")}>{t.footer.ended}</Link>
          </div>
          <div>
            <h4>{t.footer.account}</h4>
            <Link href={href("/signup")}>{t.nav.signup}</Link>
            <Link href={href("/login")}>{t.nav.login}</Link>
            <Link href={href("/wallet")}>{t.nav.wallet}</Link>
          </div>
          <div>
            <h4>{t.footer.help}</h4>
            <Link href={href("/#how")}>{t.nav.howItWorks}</Link>
            <Link href={href("/lots?tab=ended")}>{t.footer.audit}</Link>
            <Link href={href("/apresentacao")}>{t.footer.presentation}</Link>
          </div>
        </div>
        <div className="copy">
          <span>{t.footer.copy}</span>
          <span>{t.footer.source}</span>
        </div>
      </div>
    </footer>
  )
}
