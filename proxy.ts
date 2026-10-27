import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"
import { clock } from "@/lib/clock"
import { env } from "@/lib/env"
import { isLocale, LOCALE_COOKIE, pickLocale } from "@/lib/i18n/config"
import { checkReadPass, READ_PASS_COOKIE, turnstileError } from "@/server/security"

// Páginas que exigem sessão (checagem otimista: só o cookie; a página confere de verdade)
const SIGNED_IN_PAGES = ["/dashboard", "/wallet", "/my-bids"]

// Páginas estáticas, sem dados do banco: abrem direto, sem a verificação anti-bot
const PASS_FREE_PAGES = ["/verify", "/apresentacao"]

// Leituras de API liberadas sem passe
function isApiPassExempt(pathname: string): boolean {
  if (pathname === "/api/health" || pathname === "/api/turnstile/verify") return true
  // Só devolve a sessão de quem pergunta (visitante: vazio); usada pelo topo das páginas sem passe
  if (pathname === "/api/me") return true
  // Cron externo não roda Turnstile; a rota exige o CRON_SECRET
  if (pathname === "/api/cron/close-lots") return true
  // Rotas de teste só existem com TEST_MODE=1 (fora dele devolvem 404)
  return env.TEST_MODE && pathname.startsWith("/api/test/")
}

function needsPass(request: NextRequest): boolean {
  return env.TURNSTILE_ENFORCE && (request.method === "GET" || request.method === "HEAD")
}

function passReason(request: NextRequest) {
  return checkReadPass(request.cookies.get(READ_PASS_COOKIE)?.value, clock.nowMs())
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // APIs: escritas validam o próprio token; leituras precisam do passe
  if (pathname.startsWith("/api/")) {
    if (needsPass(request) && !isApiPassExempt(pathname)) {
      const reason = passReason(request)
      if (reason) {
        const error = turnstileError(reason)
        return NextResponse.json(error.toBody(), { status: error.status })
      }
    }
    return NextResponse.next()
  }

  // Páginas: o idioma vem na rota (/pt/..., /en/...); sem ele, redireciona pelo cookie ou navegador
  const [, first, ...rest] = pathname.split("/")
  if (!isLocale(first)) {
    const locale = pickLocale(request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get("accept-language"))
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`
    return NextResponse.redirect(url)
  }

  const lang = first
  const path = `/${rest.join("/")}`
  let response: NextResponse

  if (needsPass(request) && !PASS_FREE_PAGES.includes(path) && passReason(request)) {
    // Sem passe: mostra a verificação no lugar, mantendo a URL pedida
    response = NextResponse.rewrite(new URL(`/${lang}/verify`, request.url))
  } else if (SIGNED_IN_PAGES.some((page) => path === page || path.startsWith(`${page}/`)) && !getSessionCookie(request)) {
    const url = new URL(`/${lang}/login`, request.url)
    url.searchParams.set("next", path)
    response = NextResponse.redirect(url)
  } else {
    response = NextResponse.next()
  }

  // Guarda o idioma escolhido para as próximas visitas sem prefixo
  if (request.cookies.get(LOCALE_COOKIE)?.value !== lang) {
    response.cookies.set(LOCALE_COOKIE, lang, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 })
  }

  return response
}

export const config = {
  // Tudo, menos arquivos do Next, ferramentas do dev e arquivos com extensão (imagens, ícones)
  matcher: ["/((?!_next/|__nextjs|.*\\.[a-zA-Z0-9]+$).*)"],
}
