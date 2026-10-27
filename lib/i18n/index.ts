import { en } from "@/lib/i18n/en"
import { pt, type Dictionary } from "@/lib/i18n/pt"
import type { Locale } from "@/lib/i18n/config"

export { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, INTL_LOCALE, isLocale, pickLocale, type Locale } from "@/lib/i18n/config"
export type { Dictionary } from "@/lib/i18n/pt"

const DICTIONARIES: Record<Locale, Dictionary> = { pt, en }

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}
