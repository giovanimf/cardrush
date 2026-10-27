"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useI18n } from "@/components/providers"

// Tempo restante: "03:42" abaixo de 1 h, "1h 12m" abaixo de 1 dia, "3d 4h" acima
export function formatRemaining(ms: number | null): string {
  if (ms === null || Number.isNaN(ms)) return "--:--"
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86_400)
  const hours = Math.floor((total % 86_400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, "0")

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${pad(minutes)}m`
  return `${pad(minutes)}:${pad(seconds)}`
}

// Carta sobre o playmat; sem imagem (ou falha ao carregar), mostra o aviso do design
export function CardImage({ src, alt }: { src: string | null; alt: string }) {
  const { t } = useI18n()
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="no-image" data-testid="image-unavailable">
        {t.common.imageUnavailable}
      </div>
    )
  }

  // Imagens externas (Scryfall) com tamanho variável: <img> simples dentro do playmat
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
}

export type LotSummary = {
  id: string
  state: "cancelled" | "closed" | "scheduled" | "live" | "ended"
  outcome: "SOLD" | "UNSOLD" | null
  title: string | null
  setName: string | null
  releasedAt: string | null
  imageUrl: string | null
  startingBidCents: number
  currentBidCents: number | null
  bidCount: number
  startsAt: string
  endsAt: string
  winnerPseudonym?: string | null
}

export function lotSubtitle(lot: { setName: string | null; releasedAt: string | null }): string {
  return [lot.setName, lot.releasedAt?.slice(0, 4)].filter(Boolean).join(" · ")
}

// Rótulo do início de um agendado: "Hoje, 21:00", "Amanhã, 10:00" ou a data
function useOpensLabel() {
  const { t, locale } = useI18n()
  return (iso: string, nowMs: number | null) => {
    const date = new Date(iso)
    const now = new Date(nowMs ?? Date.parse(iso))
    const time = date.toLocaleTimeString(locale === "pt" ? "pt-BR" : "en-US", { hour: "2-digit", minute: "2-digit" })
    const dayDiff = Math.round(
      (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000,
    )
    if (dayDiff === 0) return `${t.state.today}, ${time}`
    if (dayDiff === 1) return `${t.state.tomorrow}, ${time}`
    return date.toLocaleString(locale === "pt" ? "pt-BR" : "en-US", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
  }
}

export function LotCard({ lot, nowMs }: { lot: LotSummary; nowMs: number | null }) {
  const { t, money, href } = useI18n()
  const opensLabel = useOpensLabel()
  const title = lot.title ?? t.common.untitled
  const isLive = lot.state === "live"
  const isScheduled = lot.state === "scheduled"

  return (
    <div className="lot" data-testid="lot-card" data-lot-id={lot.id}>
      <Link href={href(`/lots/${lot.id}`)} className="thumb" aria-label={title}>
        {isLive && <span className="badge">⏱ {formatRemaining(nowMs === null ? null : Date.parse(lot.endsAt) - nowMs)}</span>}
        {isScheduled && <span className="badge dark">{t.state.opensAt(opensLabel(lot.startsAt, nowMs))}</span>}
        {(lot.state === "closed" || lot.state === "ended") && <span className="badge sand">{t.state.closed}</span>}
        <CardImage src={lot.imageUrl} alt={title} />
      </Link>
      <div className="meta" style={{ marginTop: 12 }}>
        <div>
          <div className="name">{title}</div>
          <div className="sub">{lotSubtitle(lot)}</div>
        </div>
      </div>
      <div className="meta">
        {isLive && (
          <>
            <div>
              <div className="sub">
                {lot.bidCount > 0 ? `${t.home.currentBid} · ${t.common.bids(lot.bidCount)}` : t.home.startingBid}
              </div>
              <div className="price">{money(lot.currentBidCents ?? lot.startingBidCents)}</div>
            </div>
            <Link className="btn btn-dark btn-sm" href={href(`/lots/${lot.id}`)}>
              {t.home.placeBid}
            </Link>
          </>
        )}
        {isScheduled && (
          <>
            <div>
              <div className="sub">{t.home.startingBid}</div>
              <div className="price">{money(lot.startingBidCents)}</div>
            </div>
            <Link className="btn btn-outline btn-sm" href={href(`/lots/${lot.id}`)}>
              {t.home.viewLot}
            </Link>
          </>
        )}
        {(lot.state === "closed" || lot.state === "ended") && (
          <div className="result">
            {lot.outcome === "SOLD" && lot.currentBidCents !== null ? (
              <>
                {lot.winnerPseudonym ? <>{t.home.soldTo("")}<b>{t.common.bidder(lot.winnerPseudonym)}</b></> : t.room.soldTitle}
                <br />
                {money(lot.currentBidCents)}
              </>
            ) : lot.outcome === "UNSOLD" ? (
              <>
                <b>{t.home.noBids}</b> · {t.home.noWinner}
              </>
            ) : (
              <span className="muted">{t.room.endingTitle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Cabeçalho de página: rótulo com traço, título, subtítulo opcional e ação à direita
export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <div className="label">{eyebrow}</div>
        <h1>{title}</h1>
        {subtitle && <p className="sub">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function LotGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <div className="skeleton" style={{ aspectRatio: "1 / 1.08" }} />
          <div className="skeleton mt8" style={{ height: 16, width: "70%" }} />
          <div className="skeleton mt8" style={{ height: 14, width: "40%" }} />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="panel center" style={{ padding: 40 }} data-testid="empty-state">
      <div className="serif" style={{ fontSize: 22 }}>
        {title}
      </div>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  )
}

// Modal no desktop, bottom sheet no celular (CSS)
// Modal no desktop, bottom sheet no celular (CSS). Foco entra no diálogo ao abrir, Tab não sai
// dele, e volta para quem abriu ao fechar. busy = ação em andamento: não fecha no Esc nem no fundo.
const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex=\"-1\"])"

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  busy = false,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  labelledBy: string
  busy?: boolean
}) {
  const dialog = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    return () => opener?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose()
      if (event.key !== "Tab" || !dialog.current) return
      const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose, busy])

  if (!open) return null

  return (
    <div className="scrim" onClick={() => !busy && onClose()}>
      <div ref={dialog} className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  const { t } = useI18n()
  if (totalPages <= 1) return null

  return (
    <nav className="row mt32" style={{ justifyContent: "center" }} aria-label={t.common.page(page, totalPages)}>
      <button className="arrow" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t.common.previous}>
        ‹
      </button>
      {Array.from({ length: totalPages }, (_, index) => index + 1)
        .filter((n) => Math.abs(n - page) <= 2 || n === 1 || n === totalPages)
        .map((n) => (
          <button key={n} className={`arrow ${n === page ? "dark" : ""}`} onClick={() => onPage(n)} aria-current={n === page ? "page" : undefined}>
            {n}
          </button>
        ))}
      <button className="arrow" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label={t.common.next}>
        ›
      </button>
    </nav>
  )
}

export function CopyLinkButton({ className = "btn btn-outline", label }: { className?: string; label?: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  return (
    <button
      className={className}
      onClick={async () => {
        await navigator.clipboard?.writeText(window.location.href).catch(() => undefined)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? t.common.linkCopied : (label ?? t.common.copyLink)}
    </button>
  )
}
