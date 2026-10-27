"use client"

import Link from "next/link"
import { useState } from "react"
import { RULES } from "@/lib/rules"
import { useApi, usePolled } from "@/lib/client/api"
import { useI18n, useToast } from "@/components/providers"
import { CardImage, EmptyState, Modal, lotSubtitle, PageHeader } from "@/components/ui"
import type { PublicLot } from "@/server/lots"

type SellerLot = PublicLot & { receipt: { code: string; finalCents: number } | null }
type Tab = "all" | "live" | "scheduled" | "closed" | "cancelled"
const TABS: Tab[] = ["all", "live", "scheduled", "closed", "cancelled"]

const STATE_CHIP: Record<string, string> = { live: "live", scheduled: "dark", ended: "", closed: "", cancelled: "bad" }

export function DashboardView() {
  const { t, money, shortDate, href, errorText } = useI18n()
  const toast = useToast()
  const { send } = useApi()
  const { data, error, refresh } = usePolled<{ lots: SellerLot[]; totalReceivedCents: number }>("/api/me/lots", RULES.POLL_SHOWCASE_MS)
  const [tab, setTab] = useState<Tab>("all")
  const [toCancel, setToCancel] = useState<SellerLot | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  if (error && !data) {
    return (
      <div className="wrap" style={{ padding: "64px 0" }}>
        <EmptyState
          title={error.code === "FORBIDDEN" ? t.dashboard.forbidden : errorText(error)}
          action={<Link className="btn btn-dark" href={href("/")}>{t.notFound.cta}</Link>}
        />
      </div>
    )
  }

  const lots = data?.lots ?? []
  const count = (state: Tab) => lots.filter((lot) => (state === "closed" ? lot.state === "closed" || lot.state === "ended" : lot.state === state)).length
  const shown = tab === "all" ? lots : lots.filter((lot) => (tab === "closed" ? lot.state === "closed" || lot.state === "ended" : lot.state === tab))

  async function confirmCancel() {
    if (!toCancel) return
    setCancelling(true)
    setCancelError(null)
    try {
      await send(`/api/lots/${toCancel.id}/cancel`)
      toast.show({ title: t.dashboard.cancelled })
      setToCancel(null)
      await refresh()
    } catch (caught) {
      setCancelError(errorText(caught))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="wrap" data-testid="dashboard">
      <PageHeader
        eyebrow={t.dashboard.label}
        title={t.dashboard.title}
        subtitle={t.dashboard.subtitle}
        action={
          <Link className="btn btn-dark btn-lg" href={href("/dashboard/new")} data-testid="new-lot-button">
            {t.dashboard.newLot}
          </Link>
        }
      />

      <div className="cards4 mt24">
        <div className="stat dark">
          <small>{t.dashboard.totalReceived}</small>
          <div className="v" data-testid="dashboard-received">
            {data ? money(data.totalReceivedCents) : "—"}
          </div>
        </div>
        <div className="stat">
          <small>{t.dashboard.tabs.live}</small>
          <div className="v">{count("live")}</div>
        </div>
        <div className="stat">
          <small>{t.dashboard.tabs.scheduled}</small>
          <div className="v">{count("scheduled")}</div>
        </div>
        <div className="stat">
          <small>{t.dashboard.tabs.closed}</small>
          <div className="v">{count("closed")}</div>
        </div>
      </div>

      <div className="tabs mt24" role="tablist">
        {TABS.map((item) => (
          <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "on" : ""} onClick={() => setTab(item)}>
            {t.dashboard.tabs[item]}
            {item === "all" ? ` (${lots.length})` : ""}
          </button>
        ))}
      </div>

      <div className="mt16">
        {!data ? (
          <div className="skeleton" style={{ height: 200 }} />
        ) : lots.length === 0 ? (
          <EmptyState
            title={t.dashboard.empty}
            action={
              <Link className="btn btn-dark" href={href("/dashboard/new")}>
                {t.dashboard.emptyCta}
              </Link>
            }
          />
        ) : (
          <div className="panel table-scroll" style={{ padding: 0 }}>
            <table className="t" data-testid="dashboard-table">
              <thead>
                <tr>
                  <th>{t.dashboard.colLot}</th>
                  <th>{t.dashboard.colState}</th>
                  <th>{t.dashboard.colCurrent}</th>
                  <th>{t.dashboard.colBids}</th>
                  <th>{t.dashboard.colEnd}</th>
                  <th>{t.dashboard.colResult}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((lot) => {
                  const title = lot.title ?? t.common.untitled
                  const cancellable = (lot.state === "live" || lot.state === "scheduled") && lot.bidCount === 0
                  return (
                    <tr key={lot.id} data-testid="dashboard-row" data-lot-id={lot.id} data-state={lot.state}>
                      <td>
                        <Link className="row" href={href(`/lots/${lot.id}`)}>
                          <div className="stage mini" style={{ width: 44, height: 52, padding: 4, flex: "none" }}>
                            <CardImage src={lot.imageUrl} alt={title} />
                          </div>
                          <div>
                            <b style={{ fontFamily: "var(--sans)" }}>{title}</b>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {lotSubtitle(lot)}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <span className={`chip ${STATE_CHIP[lot.state]}`}>{t.state[lot.state]}</span>
                      </td>
                      <td>
                        {lot.currentBidCents !== null ? (
                          <b>{money(lot.currentBidCents)}</b>
                        ) : (
                          <>
                            {money(lot.startingBidCents)} <span className="muted">{t.dashboard.initial}</span>
                          </>
                        )}
                      </td>
                      <td>{lot.bidCount}</td>
                      <td className="muted">{shortDate(lot.endsAt)}</td>
                      <td>
                        {lot.state === "scheduled"
                          ? t.dashboard.opens(shortDate(lot.startsAt))
                          : lot.outcome === "SOLD" && lot.receipt
                            ? t.dashboard.resultSold(money(lot.receipt.finalCents))
                            : lot.outcome === "UNSOLD"
                              ? t.dashboard.resultUnsold
                              : "—"}
                      </td>
                      <td className="right">
                        {(lot.state === "live" || lot.state === "scheduled") && (
                          <>
                            <button
                              className={`btn btn-sm ${cancellable ? "btn-danger" : "btn-outline"}`}
                              disabled={!cancellable}
                              onClick={() => {
                                setCancelError(null)
                                setToCancel(lot)
                              }}
                              data-testid="cancel-lot"
                            >
                              {t.dashboard.cancel}
                            </button>
                            {!cancellable && (
                              <div className="hint" style={{ fontSize: 11, marginTop: 4 }}>
                                {t.dashboard.hasBids}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!toCancel} onClose={() => setToCancel(null)} labelledBy="cancel-title" busy={cancelling}>
        <h3 id="cancel-title">{t.dashboard.cancelTitle}</h3>
        <p className="muted mt8">{t.dashboard.cancelText(toCancel?.title ?? t.common.untitled)}</p>
        {cancelError && (
          <div className="banner bad mt16" role="alert">
            <div>{cancelError}</div>
          </div>
        )}
        <div className="row mt24 stack-mobile" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-outline" onClick={() => setToCancel(null)}>
            {t.dashboard.cancelKeep}
          </button>
          <button className="btn btn-danger" onClick={confirmCancel} disabled={cancelling} data-testid="confirm-cancel">
            {cancelling ? t.auth.submitting : t.dashboard.cancelConfirm}
          </button>
        </div>
      </Modal>
    </div>
  )
}
