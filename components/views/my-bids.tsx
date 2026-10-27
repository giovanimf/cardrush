"use client"

import Link from "next/link"
import { useState } from "react"
import { RULES } from "@/lib/rules"
import { usePolled, useServerNow } from "@/lib/client/api"
import { useI18n } from "@/components/providers"
import { CardImage, EmptyState, formatRemaining, lotSubtitle, PageHeader } from "@/components/ui"
import type { ParticipationStatus } from "@/server/bidding"

type Item = {
  lotId: string
  title: string | null
  setName: string | null
  releasedAt: string | null
  imageUrl: string | null
  status: ParticipationStatus
  endsAt: string
  currentBidCents: number | null
  myMaxCents: number
  receipt: { code: string; finalCents: number; issuedAt: string } | null
}

const CHIP: Record<ParticipationStatus, string> = { winning: "ok", outbid: "warn", won: "dark", lost: "bad", cancelled: "bad", closing: "" }

export function MyBidsView() {
  const { t, money, shortDate, href, errorText } = useI18n()
  const { data, error } = usePolled<{ items: Item[]; serverNow: string }>("/api/me/bids", RULES.POLL_SHOWCASE_MS)
  const nowMs = useServerNow(data?.serverNow)
  const [tab, setTab] = useState<"active" | "history">("active")

  if (error && !data) {
    return (
      <div className="wrap" style={{ padding: "64px 0" }}>
        <EmptyState title={errorText(error)} action={<Link className="btn btn-dark" href={href("/")}>{t.notFound.cta}</Link>} />
      </div>
    )
  }

  const items = data?.items ?? []
  const active = items.filter((item) => item.status === "winning" || item.status === "outbid" || item.status === "closing")
  const history = items.filter((item) => !active.includes(item))
  const shown = tab === "active" ? active : history

  const statusLabel: Record<ParticipationStatus, string> = {
    winning: t.myBids.winning,
    outbid: t.myBids.outbid,
    won: t.myBids.won,
    lost: t.myBids.lost,
    cancelled: t.myBids.cancelled,
    closing: t.state.ended,
  }

  return (
    <div className="wrap" data-testid="my-bids">
      <PageHeader eyebrow={t.myBids.label} title={t.myBids.title} subtitle={t.myBids.subtitle} />

      <div className="tabs mt24" role="tablist">
        <button role="tab" aria-selected={tab === "active"} className={tab === "active" ? "on" : ""} onClick={() => setTab("active")}>
          {t.myBids.participating(active.length)}
        </button>
        <button role="tab" aria-selected={tab === "history"} className={tab === "history" ? "on" : ""} onClick={() => setTab("history")}>
          {t.myBids.history(history.length)}
        </button>
      </div>

      <div className="mt24">
        {!data ? (
          <div className="skeleton" style={{ height: 116 }} />
        ) : shown.length === 0 ? (
          <EmptyState
            title={tab === "active" ? t.myBids.emptyParticipating : t.myBids.emptyHistory}
            action={
              <Link className="btn btn-dark" href={href("/lots")}>
                {t.myBids.goShowcase}
              </Link>
            }
          />
        ) : (
          shown.map((item) => {
            const title = item.title ?? t.common.untitled
            return (
              <div key={item.lotId} className="panel row stack-mobile" style={{ padding: 16, marginBottom: 12, gap: 20 }} data-testid="my-bid-item" data-status={item.status}>
                <div className="stage mini" style={{ width: 84, height: 84, padding: 8, flex: "none" }}>
                  <CardImage src={item.imageUrl} alt={title} />
                </div>
                <div className="grow">
                  <div className="row wrap-row">
                    <b>{title}</b>
                    <span className={`chip ${CHIP[item.status]}`}>{statusLabel[item.status]}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {lotSubtitle(item)}
                  </div>
                  <div className="mt8" style={{ fontSize: 13 }}>
                    {item.status === "winning" && (
                      <>
                        {t.myBids.currentLine(money(item.currentBidCents ?? 0))} · {t.myBids.endsIn} <b>{formatRemaining(nowMs === null ? null : Date.parse(item.endsAt) - nowMs)}</b>
                      </>
                    )}
                    {item.status === "outbid" && (
                      <>
                        {t.myBids.myMax(money(item.myMaxCents))} · {t.myBids.currentLine(money(item.currentBidCents ?? 0))}
                      </>
                    )}
                    {item.status === "won" && item.receipt && t.myBids.wonLine(money(item.receipt.finalCents), shortDate(item.receipt.issuedAt))}
                    {item.status === "lost" && t.myBids.lostLine(money(item.currentBidCents ?? 0), money(item.myMaxCents))}
                    {item.status === "closing" && t.room.endingText}
                  </div>
                </div>
                <div className="row wrap-row">
                  {(item.status === "winning" || item.status === "closing") && (
                    <Link className="btn btn-dark btn-sm" href={href(`/lots/${item.lotId}`)}>
                      {t.myBids.goRoom}
                    </Link>
                  )}
                  {item.status === "outbid" && (
                    <Link className="btn btn-outline btn-sm" href={href(`/lots/${item.lotId}`)}>
                      {t.myBids.bidAgain}
                    </Link>
                  )}
                  {item.status === "won" && item.receipt && (
                    <Link className="btn btn-dark btn-sm" href={href(`/receipts/${item.receipt.code}`)}>
                      {t.myBids.seeReceipt}
                    </Link>
                  )}
                  {(item.status === "lost" || item.status === "won") && (
                    <Link className="btn btn-outline btn-sm" href={href(`/lots/${item.lotId}/audit`)}>
                      {t.myBids.seeAudit}
                    </Link>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
