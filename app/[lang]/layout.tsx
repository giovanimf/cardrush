import type { Metadata, Viewport } from "next"
import { InlineScript } from "@/components/inline-script"
import { THEME_COLORS, THEME_SCRIPT } from "@/lib/theme"
import { notFound } from "next/navigation"
import { IBM_Plex_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google"
import { env } from "@/lib/env"
import { getDictionary, isLocale, LOCALES, INTL_LOCALE } from "@/lib/i18n"
import { TurnstileProvider } from "@/components/turnstile"
import { I18nProvider, SessionProvider, ToastProvider } from "@/components/providers"
import { Footer, SubNav, TabBar, TopBar } from "@/components/shell"
import { Suspense } from "react"
import "../globals.css"

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-space-grotesk" })
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-jetbrains" })

type Props = { children: React.ReactNode; params: Promise<{ lang: string }> }

// Os dois idiomas são pré-gerados (Cache Components exige ao menos um valor por parâmetro raiz)
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }))
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { lang } = await params
  const t = getDictionary(isLocale(lang) ? lang : "pt")
  return { title: t.meta.title, description: t.meta.description }
}

export default async function RootLayout({ children, params }: Props) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()

  return (
    // suppressHydrationWarning: o script do tema muda o data-theme do <html> antes do React hidratar
    <html lang={INTL_LOCALE[lang]} className={`${spaceGrotesk.variable} ${plex.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body>
        <TurnstileProvider siteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}>
          <I18nProvider locale={lang}>
            <SessionProvider>
              <ToastProvider>
                <TopBar />
                {/* Menus leem a URL (usePathname): ficam em Suspense para não bloquear a página */}
                <Suspense fallback={<nav className="subnav" />}>
                  <SubNav />
                </Suspense>
                <main>{children}</main>
                <Footer />
                <Suspense fallback={null}>
                  <TabBar />
                </Suspense>
              </ToastProvider>
            </SessionProvider>
          </I18nProvider>
        </TurnstileProvider>
      </body>
    </html>
  )
}
