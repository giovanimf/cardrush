"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { newIdempotencyKey, useApi, useHydrated, usePolled } from "@/lib/client/api"
import { useI18n, useSession, useToast, type WalletSummary } from "@/components/providers"
import { EmptyState, Pagination, PageHeader } from "@/components/ui"

type EntryType = "DEPOSIT" | "COMMIT" | "RELEASE" | "SETTLEMENT_DEBIT" | "SETTLEMENT_CREDIT"
type Entry = { id: string; type: EntryType; amountCents: number; lotId: string | null; createdAt: string }
type WalletResponse = { wallet: WalletSummary; entries: { page: number; totalPages: number; total: number; items: Entry[] } }

const CHIP: Record<EntryType, string> = { DEPOSIT: "ok", COMMIT: "warn", RELEASE: "ok", SETTLEMENT_DEBIT: "dark", SETTLEMENT_CREDIT: "ok" }
const SIGN: Record<EntryType, "+" | "−" | ""> = { DEPOSIT: "+", COMMIT: "", RELEASE: "+", SETTLEMENT_DEBIT: "−", SETTLEMENT_CREDIT: "+" }
const QUICK_AMOUNTS = [10_000, 50_000, 100_000]

export function WalletView() {
  const { t, money, shortDate, href, errorText, parseMoney, plainMoney } = useI18n()
  const session = useSession()
  const toast = useToast()
  const { send } = useApi()
  const [page, setPage] = useState(1)
  const { data, error, refresh } = usePolled<WalletResponse>(`/api/wallet?page=${page}`, null)
  const [amount, setAmount] = useState("")
  const [depositError, setDepositError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const hydrated = useHydrated()
  // Mesma chave até o depósito dar certo: reenvio (clique duplo, rede instável) não credita duas vezes
  const depositKey = useRef<string | null>(null)

  if (error?.code === "FORBIDDEN" || error?.code === "AUTH_REQUIRED") {
    return (
      <div className="wrap" style={{ padding: "64px 0" }}>
        <EmptyState title={errorText(error)} action={<Link className="btn btn-dark" href={href("/")}>{t.notFound.cta}</Link>} />
      </div>
    )
  }

  async function deposit(event: React.FormEvent) {
    event.preventDefault()
    setDepositError(null)
    const cents = parseMoney(amount)
    if (cents === null || cents <= 0) return setDepositError(t.newLot.fieldErrors.INVALID_MONEY)

    depositKey.current ??= newIdempotencyKey()
    setSubmitting(true)
    try {
      // Envia normalizado ("1234.56"): o servidor não precisa saber o idioma de quem digitou
      await send("/api/wallet/deposits", { amount: (cents / 100).toFixed(2), idempotencyKey: depositKey.current })
      depositKey.current = null
      setAmount("")
      toast.show({ title: t.wallet.depositDone(money(cents)) })
      await Promise.all([refresh(), session.refresh()])
    } catch (caught) {
      setDepositError(errorText(caught))
    } finally {
      setSubmitting(false)
    }
  }

  const addQuick = (cents: number) => {
    const current = parseMoney(amount) ?? 0
    setAmount(plainMoney(current + cents))
    depositKey.current = null
  }

  const wallet = data?.wallet

  return (
    <div className="wrap" data-testid="wallet">
      <PageHeader eyebrow={t.wallet.label} title={t.wallet.title} subtitle={t.wallet.subtitle} />

      <div className="cards3 mt24">
        <div className="stat dark">
          <small>{t.wallet.total}</small>
          <div className="v" data-testid="wallet-total">
            {wallet ? money(wallet.totalCents) : "—"}
          </div>
        </div>
        <div className="stat">
          <small>{t.wallet.committed}</small>
          <div className="v" data-testid="wallet-committed">
            {wallet ? money(wallet.committedCents) : "—"}
          </div>
          <span className="hint">{t.wallet.committedHint}</span>
        </div>
        <div className="stat">
          <small>{t.wallet.available}</small>
          <div className="v" data-testid="wallet-available">
            {wallet ? money(wallet.availableCents) : "—"}
          </div>
          <span className="hint">{t.wallet.availableHint}</span>
        </div>
      </div>

      <div className="row mt24 stack-mobile" style={{ alignItems: "stretch" }}>
        <form className="panel grow" onSubmit={deposit}>
          <h3>{t.wallet.depositTitle}</h3>
          <p className="muted mt8">{t.wallet.depositText}</p>
          <div className="row mt16">
            <label className={`input grow ${depositError ? "err" : ""}`}>
              <span className="muted">R$</span>
              <span className="sr-only">{t.wallet.depositAmount}</span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  depositKey.current = null
                }}
                placeholder={plainMoney(50_000)}
                data-testid="deposit-input"
              />
            </label>
            <button className="btn btn-dark" type="submit" disabled={!hydrated || submitting} data-testid="deposit-submit">
              {submitting ? t.auth.submitting : t.wallet.depositButton}
            </button>
          </div>
          {depositError && (
            <div className="hint err mt8" role="alert" data-testid="deposit-error">
              {depositError}
            </div>
          )}
          <div className="row mt16 wrap-row">
            {QUICK_AMOUNTS.map((cents) => (
              <button key={cents} type="button" className="chip" onClick={() => addQuick(cents)}>
                + {money(cents)}
              </button>
            ))}
          </div>
        </form>
        <div className="panel beige aside-320">
          <h3>{t.wallet.howTitle}</h3>
          <p className="muted mt8" style={{ fontSize: 13 }}>
            {t.wallet.howText}
          </p>
        </div>
      </div>

      <div className="section" style={{ marginTop: 36 }}>
        <div className="section-head">
          <span className="label">{t.wallet.statement}</span>
        </div>
        <div className="panel table-scroll" style={{ padding: 0 }}>
          {data && data.entries.items.length === 0 ? (
            <p className="muted center" style={{ padding: 20, margin: 0 }}>
              {t.wallet.empty}
            </p>
          ) : (
            <table className="t" data-testid="wallet-statement">
              <thead>
                <tr>
                  <th>{t.wallet.colDate}</th>
                  <th>{t.wallet.colType}</th>
                  <th>{t.wallet.colDescription}</th>
                  <th className="right">{t.wallet.colAmount}</th>
                </tr>
              </thead>
              <tbody>
                {data?.entries.items.map((entry) => (
                  <tr key={entry.id} data-type={entry.type}>
                    <td className="muted">{shortDate(entry.createdAt)}</td>
                    <td>
                      <span className={`chip ${CHIP[entry.type]}`}>{t.wallet.types[entry.type]}</span>
                    </td>
                    <td>
                      {t.wallet.descriptions[entry.type]}
                      {entry.lotId && (
                        <>
                          {" · "}
                          <Link className="gold" href={href(`/lots/${entry.lotId}`)}>
                            {t.wallet.seeLot}
                          </Link>
                        </>
                      )}
                    </td>
                    <td className={`right ${SIGN[entry.type] === "+" ? "pos" : SIGN[entry.type] === "−" ? "neg" : ""}`}>
                      <b>
                        {SIGN[entry.type] && `${SIGN[entry.type]} `}
                        {money(entry.amountCents)}
                      </b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {data && <Pagination page={data.entries.page} totalPages={data.entries.totalPages} onPage={setPage} />}
      </div>
    </div>
  )
}
