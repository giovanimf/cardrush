"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { usePolled } from "@/lib/client/api"
import { useI18n } from "@/components/providers"
import { CardImage, CopyLinkButton, EmptyState } from "@/components/ui"

type Receipt = {
  code: string
  finalCents: number
  bidCount: number
  chainHead: string | null
  issuedAt: string
  lot: { id: string; title: string | null; setName: string | null; imageUrl: string | null; seller: { name: string } }
}

export function ReceiptView() {
  const { code } = useParams<{ code: string }>()
  const { t, money, dateTime, href, errorText } = useI18n()
  const { data, error, refresh } = usePolled<{ receipt: Receipt }>(`/api/receipts/${encodeURIComponent(code)}`, null)

  if (error && !data) {
    return (
      <div className="wrap" style={{ padding: "64px 0" }}>
        {error.code === "RECEIPT_NOT_FOUND" ? (
          <EmptyState
            title={t.receipt.notFoundTitle}
            text={t.receipt.notFoundText}
            action={
              <Link className="btn btn-dark" href={href("/lots")}>
                {t.room.goShowcase}
              </Link>
            }
          />
        ) : (
          <EmptyState
            title={errorText(error)}
            action={
              <button className="btn btn-dark" onClick={refresh}>
                {t.common.retry}
              </button>
            }
          />
        )}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="wrap">
        <div className="receipt skeleton" style={{ height: 420 }} />
      </div>
    )
  }

  const receipt = data.receipt
  const title = receipt.lot.title ?? t.common.untitled
  const head = receipt.chainHead

  return (
    <div className="wrap">
      <div className="receipt" data-testid="receipt">
        <div className="head">
          <div>
            <div className="label" style={{ color: "var(--gold-2)" }}>
              {t.receipt.label}
            </div>
            <div className="serif" style={{ fontSize: 24, marginTop: 4 }}>
              {title}
            </div>
          </div>
          <div className="right">
            <div className="hint" style={{ color: "var(--on-ink-muted)" }}>
              {t.receipt.code}
            </div>
            <b style={{ color: "var(--gold-2)", letterSpacing: ".08em" }} className="mono" data-testid="receipt-code">
              {receipt.code}
            </b>
          </div>
        </div>
        <div className="body">
          <div className="stage">
            <CardImage src={receipt.lot.imageUrl} alt={title} />
          </div>
          <div>
            <div className="kv">
              <span>{t.receipt.finalValue}</span>
              <b style={{ font: "600 24px var(--serif)" }} data-testid="receipt-final">
                {money(receipt.finalCents)}
              </b>
              <span>{t.receipt.dateTime}</span>
              <div>{dateTime(receipt.issuedAt)}</div>
              <span>{t.receipt.seller}</span>
              <div>{receipt.lot.seller.name}</div>
              <span>{t.receipt.winner}</span>
              <div className="muted">{t.receipt.winnerHidden}</div>
              <span>{t.receipt.bidCount}</span>
              <div>{receipt.bidCount}</div>
              <span>{t.receipt.origin}</span>
              <div>{t.common.scryfall}</div>
            </div>
            {head && (
              <div className="mt24">
                <div className="hint">{t.receipt.fingerprint}</div>
                <div className="hash" title={head}>
                  {head.slice(0, 12)}… {head.slice(-12)}
                </div>
              </div>
            )}
            <div className="row mt24 wrap-row">
              <CopyLinkButton className="btn btn-dark" />
              <Link className="btn btn-outline" href={href(`/lots/${receipt.lot.id}/audit`)}>
                {t.receipt.seeAudit}
              </Link>
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 32px", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--muted)" }}>{t.receipt.privacy}</div>
      </div>
    </div>
  )
}
