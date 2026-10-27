"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { usePolled } from "@/lib/client/api"
import { useI18n } from "@/components/providers"
import { EmptyState, PageHeader } from "@/components/ui"
import type { RoomState } from "@/server/bidding"

type AuditEntry = {
  seq: number
  type: "BID" | "EXTENSION" | "CANCELLED" | "CLOSED"
  createdAt: string
  prevHash: string
  hash: string
  data: Record<string, unknown>
}

type Audit = {
  status: "INTACT" | "TAMPERED"
  firstBrokenSeq: number | null
  problems: string[]
  chainHead: string | null
  checkedAt: string
  entries: AuditEntry[]
}

export function AuditView() {
  const { id } = useParams<{ id: string }>()
  const { t, money, time, dateTime, href, errorText } = useI18n()
  // Recalculada a cada acesso no servidor; aqui só busca de novo a cada 10 s
  const audit = usePolled<Audit>(`/api/lots/${id}/audit`, 10_000)
  const lot = usePolled<RoomState>(`/api/lots/${id}`, null)

  if (audit.error && !audit.data) {
    return (
      <div className="wrap" style={{ padding: "64px 0" }}>
        <EmptyState
          title={audit.error.code === "LOT_NOT_FOUND" ? t.room.notFoundTitle : errorText(audit.error)}
          action={
            <Link className="btn btn-dark" href={href("/lots")}>
              {t.room.goShowcase}
            </Link>
          }
        />
      </div>
    )
  }

  const data = audit.data
  const title = lot.data?.lot.title ?? t.common.untitled
  const intact = data?.status === "INTACT"

  function detail(entry: AuditEntry): string {
    const d = entry.data
    switch (entry.type) {
      case "BID":
        return `${t.common.bidder(String(d.bidder))} · ${money(Number(d.amountCents))}`
      case "EXTENSION":
        return t.audit.extensionDetail(time(String(d.toEndsAt)))
      case "CLOSED":
        return d.outcome === "SOLD" ? t.audit.closedSold(t.common.bidder(String(d.winner)), money(Number(d.finalCents))) : t.audit.closedUnsold
      default:
        return "—"
    }
  }

  return (
    <div className="wrap" data-testid="audit">
      <PageHeader eyebrow={t.audit.label} title={t.audit.title(title)} subtitle={t.audit.intro} />

      {!data ? (
        <div className="skeleton mt24" style={{ height: 84 }} />
      ) : (
        <div className={`seal ${intact ? "ok" : "bad"} mt24`} data-testid="audit-seal" data-status={data.status}>
          <div className="ic" aria-hidden="true">
            {intact ? "✓" : "!"}
          </div>
          <div>
            <b style={{ fontSize: 16 }}>{intact ? t.audit.intactTitle : t.audit.tamperedTitle}</b>
            <div style={{ fontSize: 13 }}>{intact ? t.audit.intactText(data.entries.length) : t.audit.tamperedText(data.firstBrokenSeq)}</div>
            {!intact && data.problems.length > 0 && (
              <div className="hint mt8" data-testid="audit-problems">
                {data.problems.map((problem) => t.audit.problems[problem] ?? problem).join(" · ")}
              </div>
            )}
          </div>
          <div className="grow" />
          <span className="hint">{t.audit.checkedAt(dateTime(data.checkedAt))}</span>
        </div>
      )}

      <div className="row mt24 stack-mobile" style={{ alignItems: "flex-start", gap: 32 }}>
        <div className="grow">
          <div className="section-head">
            <span className="label">{t.audit.entries}</span>
            <Link className="hint" href={href(`/lots/${id}`)}>
              {title} ›
            </Link>
          </div>
          <div className="panel table-scroll" style={{ padding: 0 }}>
            {data && data.entries.length === 0 ? (
              <p className="muted center" style={{ padding: 20, margin: 0 }}>
                {t.audit.empty}
              </p>
            ) : (
              <table className="t" data-testid="audit-table">
                <thead>
                  <tr>
                    <th>{t.audit.colSeq}</th>
                    <th>{t.audit.colEvent}</th>
                    <th>{t.audit.colDetail}</th>
                    <th>{t.audit.colTime}</th>
                    <th>{t.audit.colCheck}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.entries.map((entry) => {
                    const broken = !intact && data.firstBrokenSeq !== null && entry.seq >= data.firstBrokenSeq
                    return (
                      <tr key={entry.seq} className={broken ? "bad" : ""}>
                        <td>#{entry.seq}</td>
                        <td>{t.audit.events[entry.type]}</td>
                        <td>{detail(entry)}</td>
                        <td className="muted">{time(entry.createdAt)}</td>
                        <td>
                          <span className={`chip ${broken ? "bad" : "ok"}`}>{broken ? t.audit.bad : t.audit.ok}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          {data?.chainHead && (
            <div className="mt16">
              <div className="hint">{t.audit.chainHead}</div>
              <div className="hash" data-testid="audit-chain-head">
                {data.chainHead}
              </div>
            </div>
          )}
        </div>

        <div className="aside-320">
          <div className="panel beige">
            <h3>{t.audit.verifiedTitle}</h3>
            <ul style={{ paddingLeft: 18, margin: "12px 0 0", fontSize: 13, color: "var(--text-2)" }}>
              {t.audit.verified.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="panel mt16">
            <div className="hint">{t.audit.privacyTitle}</div>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>{t.audit.privacyText}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
