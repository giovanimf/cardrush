import type { Metadata } from "next"
import Link from "next/link"
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google"
import { InlineScript } from "@/components/inline-script"
import { THEME_SCRIPT } from "@/lib/theme"
import "./globals.css"

// 404 de URLs que não batem com nenhuma rota. Não passa pelo layout com idioma,
// então traz o próprio <html>, as fontes e o texto nos dois idiomas.
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"], variable: "--font-space-grotesk" })
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-plex" })

export const metadata: Metadata = { title: "404 · CardRush" }

export default function GlobalNotFound() {
  return (
    <html lang="pt-BR" className={`${spaceGrotesk.variable} ${plex.variable}`} suppressHydrationWarning>
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body>
        <header className="topbar">
          <div className="wrap bar">
            <Link className="logo" href="/">
              Card<b>Rush</b>
            </Link>
          </div>
        </header>
        <main className="wrap" style={{ padding: "64px 16px" }}>
          <div className="panel center" style={{ padding: 40 }} data-testid="empty-state">
            <div className="serif" style={{ fontSize: 22 }}>
              Página não encontrada · Page not found
            </div>
            <p className="muted">O endereço pode estar incorreto. · The address may be wrong.</p>
            <div className="row" style={{ justifyContent: "center", flexWrap: "wrap" }}>
              <Link className="btn btn-dark" href="/pt/lots">
                Ir para a vitrine
              </Link>
              <Link className="btn btn-outline" href="/en/lots">
                Go to auctions
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
