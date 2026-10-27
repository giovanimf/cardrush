// Idiomas da interface. A rota leva o idioma (/pt/..., /en/...); o cookie guarda a escolha.
export const LOCALES = ["pt", "en"] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "pt"
export const LOCALE_COOKIE = "lang"

// Locale do Intl para números, moeda e datas
export const INTL_LOCALE: Record<Locale, string> = { pt: "pt-BR", en: "en-US" }

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value)
}

// Escolhe o idioma: cookie primeiro, depois Accept-Language, senão português
export function pickLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookieValue)) return cookieValue
  const preferred = (acceptLanguage ?? "")
    .split(",")
    .map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase())
  return preferred.find(isLocale) ?? DEFAULT_LOCALE
}
