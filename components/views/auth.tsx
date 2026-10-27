"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { TURNSTILE_TOKEN_FIELD } from "@/components/turnstile"
import { ApiError, useApi, useHydrated, usePolled } from "@/lib/client/api"
import { useI18n, useSession } from "@/components/providers"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Destino depois do login: só caminhos internos (evita redirecionar para fora)
function useNextPath(): string {
  const next = useSearchParams().get("next")
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/"
  return next.replace(/^\/(pt|en)(?=\/|$)/, "") || "/"
}

function AuthArt({ image, caption }: { image: string; caption: string }) {
  return (
    <div className="art">
      <div className="stage" style={{ background: "none", height: 440, width: "100%" }}>
        {/* Arte decorativa do design (Scryfall) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" />
      </div>
      <div className="cap">{caption}</div>
    </div>
  )
}

const LOGIN_ART = "/art/ancestral-recall.jpg"
const SIGNUP_ART = "/art/time-walk.jpg"

export function LoginView() {
  const { t, href } = useI18n()
  const { refresh } = useSession()
  const { token } = useApi()
  const router = useRouter()
  const next = useNextPath()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const hydrated = useHydrated()

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!EMAIL.test(email)) return setError(t.auth.invalidEmail)
    if (password.length < 8) return setError(t.auth.shortPassword)

    setSubmitting(true)
    try {
      let turnstileToken: string
      try {
        turnstileToken = await token()
      } catch {
        return setError(t.errors.TURNSTILE_FAILED as string)
      }

      const result = await authClient.signIn.email({
        email,
        password,
        fetchOptions: { headers: { [TURNSTILE_TOKEN_FIELD]: turnstileToken } },
      })

      if (result.error) {
        const code = result.error.code === "INVALID_EMAIL_OR_PASSWORD" ? "INVALID_CREDENTIALS" : result.error.status === 403 ? "TURNSTILE_FAILED" : "INTERNAL_ERROR"
        return setError(t.errors[code] as string)
      }

      await refresh()
      router.push(href(next))
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth">
      <AuthArt image={LOGIN_ART} caption={t.auth.loginArt} />
      <form className="form" onSubmit={submit} noValidate data-testid="login-form">
        <div className="label">{t.auth.loginLabel}</div>
        <h2 className="mt8 mb24">{t.auth.loginTitle}</h2>
        {error && (
          <div className="banner bad mb16" role="alert" data-testid="login-error">
            <div>{error}</div>
          </div>
        )}
        <div className="field">
          <label htmlFor="email">{t.auth.email}</label>
          <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">{t.auth.password}</label>
          <input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-dark btn-lg btn-block mt8" type="submit" disabled={!hydrated || submitting} data-testid="login-submit">
          {submitting ? t.auth.submitting : t.auth.submitLogin}
        </button>
        <p className="hint mt16 center">
          {t.auth.noAccount}{" "}
          <Link href={`${href("/signup")}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>
            <b>{t.auth.submitSignup}</b>
          </Link>
        </p>
        <p className="hint mt24 center">🛡 {t.common.turnstileNote}</p>
      </form>
    </div>
  )
}

type FieldErrors = Partial<Record<"name" | "email" | "password" | "form", string>>

export function SignupView() {
  const { t, href, errorText } = useI18n()
  const { refresh } = useSession()
  const { send } = useApi()
  const router = useRouter()
  const next = useNextPath()
  const roles = usePolled<{ roles: string[] }>("/api/roles", null)
  const [role, setRole] = useState("bidder")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const hydrated = useHydrated()

  const labels: Record<string, { title: string; sub: string }> = {
    bidder: { title: t.auth.roleBidder, sub: t.auth.roleBidderSub },
    auctioneer: { title: t.auth.roleAuctioneer, sub: t.auth.roleAuctioneerSub },
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const found: FieldErrors = {}
    if (!name.trim()) found.name = t.auth.requiredName
    if (!EMAIL.test(email)) found.email = t.auth.invalidEmail
    if (password.length < 8) found.password = t.auth.shortPassword
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      await send("/api/signup", { name, email, password, role })
      await refresh()
      router.push(href(next !== "/" ? next : role === "auctioneer" ? "/dashboard" : "/wallet"))
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError && error.code === "EMAIL_ALREADY_REGISTERED") setErrors({ email: errorText(error) })
      else setErrors({ form: errorText(error) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth">
      <AuthArt image={SIGNUP_ART} caption={t.auth.signupArt} />
      <form className="form" onSubmit={submit} noValidate data-testid="signup-form">
        <div className="label">{t.auth.signupLabel}</div>
        <h2 className="mt8 mb24">{t.auth.signupTitle}</h2>
        {errors.form && (
          <div className="banner bad mb16" role="alert">
            <div>{errors.form}</div>
          </div>
        )}
        <div className="seg mb24" role="radiogroup">
          {(roles.data?.roles ?? ["bidder", "auctioneer"]).map((item) => (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={role === item}
              className={role === item ? "on" : ""}
              onClick={() => setRole(item)}
              data-testid={`role-${item}`}
            >
              {labels[item]?.title ?? item}
              <small>{labels[item]?.sub ?? item}</small>
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="name">{t.auth.displayName}</label>
          <input id="name" className={`input ${errors.name ? "err" : ""}`} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          {errors.name && <span className="hint err">{errors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="email">{t.auth.email}</label>
          <input id="email" className={`input ${errors.email ? "err" : ""}`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {errors.email && (
            <span className="hint err" data-testid="signup-email-error">
              {errors.email}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="password">{t.auth.password}</label>
          <input
            id="password"
            className={`input ${errors.password ? "err" : ""}`}
            type="password"
            autoComplete="new-password"
            placeholder={t.auth.passwordHint}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <span className="hint err">{errors.password}</span>}
        </div>
        <button className="btn btn-dark btn-lg btn-block mt8" type="submit" disabled={!hydrated || submitting} data-testid="signup-submit">
          {submitting ? t.auth.submitting : t.auth.submitSignup}
        </button>
        <p className="hint mt16 center">
          {t.auth.hasAccount}{" "}
          <Link href={href("/login")}>
            <b>{t.auth.submitLogin}</b>
          </Link>
        </p>
        <p className="hint mt24 center">🛡 {t.common.turnstileNote}</p>
      </form>
    </div>
  )
}
