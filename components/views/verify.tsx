"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { refreshReadPass, useTurnstileSiteKey } from "@/components/turnstile"
import { useI18n } from "@/components/providers"

// Mostrada pelo proxy no lugar de qualquer página quando falta o passe de leitura.
// Obtém o passe e recarrega a mesma URL.
export function VerifyView() {
  const { t, href } = useI18n()
  const siteKey = useTurnstileSiteKey()
  const [attempt, setAttempt] = useState(0)
  const [failedAttempt, setFailedAttempt] = useState<number | null>(null)

  useEffect(() => {
    refreshReadPass(siteKey)
      .then(() => window.location.reload())
      .catch(() => setFailedAttempt(attempt))
  }, [siteKey, attempt])

  if (failedAttempt !== attempt) {
    return (
      <div className="wrap center" style={{ padding: "96px 0" }} data-testid="verify-checking">
        <p className="muted">{t.verify.checking}</p>
      </div>
    )
  }

  return (
    <div className="wrap" style={{ padding: "64px 0" }}>
      <div className="panel center" style={{ maxWidth: 560, margin: "0 auto", padding: 40 }} role="alert" data-testid="verify-failed">
        <h2>{t.verify.failTitle}</h2>
        <p className="muted mt16">{t.verify.failText}</p>
        <div className="row mt24" style={{ justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-dark" onClick={() => setAttempt((value) => value + 1)}>
            {t.common.retry}
          </button>
          <Link className="btn btn-outline" href={href("/")}>
            {t.verify.backHome}
          </Link>
        </div>
        <p className="hint mt24">{t.verify.reason}</p>
      </div>
    </div>
  )
}
