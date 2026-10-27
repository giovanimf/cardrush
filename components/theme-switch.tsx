"use client"

import { useLayoutEffect, useSyncExternalStore } from "react"
import { useI18n } from "@/components/providers"
import { useHydrated } from "@/lib/client/api"
import { THEME_STORAGE_KEY, THEMES, type Theme } from "@/lib/theme"

const CHANGE_EVENT = "cardrush-theme-change"

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return saved === "light" || saved === "dark" ? saved : "system"
  } catch {
    return "system"
  }
}

function applyTheme(theme: Theme) {
  if (theme === "system") document.documentElement.removeAttribute("data-theme")
  else document.documentElement.setAttribute("data-theme", theme)
}

function saveTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Sem localStorage (modo privado bloqueado): vale só nesta página
  }
  applyTheme(theme)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

const ICONS: Record<Theme, React.ReactNode> = {
  system: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  dark: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
}

// Um botão que alterna Sistema → Claro → Escuro
export function ThemeSwitch() {
  const { t } = useI18n()
  // No servidor e na hidratação vale "system"; depois o React lê a escolha salva
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme)
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
  // Antes de hidratar o clique se perderia: o botão só habilita depois
  const hydrated = useHydrated()

  // Em dev o Strict Mode remonta o <html> e apaga o data-theme do script; reaplica antes da pintura
  useLayoutEffect(() => {
    applyTheme(readTheme())
  }, [])

  return (
    <button
      type="button"
      className="theme-switch"
      aria-label={t.nav.theme.label(t.nav.theme[theme], t.nav.theme[next])}
      title={t.nav.theme.label(t.nav.theme[theme], t.nav.theme[next])}
      data-testid="theme-switch"
      data-theme-choice={theme}
      disabled={!hydrated}
      onClick={() => saveTheme(next)}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICONS[theme]}
      </svg>
    </button>
  )
}
