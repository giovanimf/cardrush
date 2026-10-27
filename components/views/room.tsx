"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { RULES } from "@/lib/rules"
import { ApiError, newIdempotencyKey, useApi, useHydrated, usePolled, useServerNow } from "@/lib/client/api"
import { useI18n, useSession, useToast, type WalletSummary } from "@/components/providers"
import { CardImage, CopyLinkButton, EmptyState, formatRemaining, lotSubtitle } from "@/components/ui"
import type { PublicLot } from "@/server/lots"
import type { RoomUpdate } from "@/server/bidding"

type RoomFull = { lot: PublicLot; room: RoomUpdate }
type BidResponse = { replayed: boolean; extendedByMs: number; room: RoomUpdate; wallet: WalletSummary }

const MINUTE = 60_000

const isFinal = (room: RoomUpdate) => room.state === "closed" || room.state === "cancelled"

export function RoomView() {
  const { id } = useParams<{ id: string }>()
  const { t, money, time, dateTime, href, errorText, parseMoney, plainMoney } = useI18n()
  const session = useSession()
  const toast = useToast()
  const { send } = useApi()

  const full = usePolled<RoomFull>(`/api/lots/${id}`, null)
  const initialRoom = full.data?.room
  // Logado: 2 s; visitante: 5 s. Fechado ou cancelado, para (o resultado não muda mais).
  const interval = initialRoom?.state === "cancelled" ? null : session.user ? RULES.POLL_ROOM_AUTHENTICATED_MS : RULES.POLL_ROOM_VISITOR_MS
  const live = usePolled<RoomUpdate>(full.data ? `/api/lots/${id}/room` : null, interval, isFinal)
  const room = live.data ?? initialRoom
  const nowMs = useServerNow(room?.serverNow)

  const [amountText, setAmountText] = useState("")
  const [bidError, setBidError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const bidKey = useRef<{ cents: number; key: string } | null>(null)
  const hydrated = useHydrated()

  // Avisos entre consultas: superado e prorrogado
  const previous = useRef<RoomUpdate | null>(null)
  useEffect(() => {
    const before = previous.current
    if (room && before && full.data) {
      const title = full.data.lot.title ?? t.common.untitled
      if (before.viewer?.position === "leading" && room.viewer?.position === "outbid") {
        toast.show({ title: t.room.toastOutbid, text: t.room.toastOutbidText(title, money(room.currentBidCents ?? 0)), tone: "bad" })
        void session.refresh()
      }
      if (Date.parse(room.endsAt) > Date.parse(before.endsAt)) {
        toast.show({ title: t.room.toastExtended, text: t.room.toastExtendedText })
      }
    }
    previous.current = room ?? null
    // Só reage à troca do estado da sala
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room])

  if (full.error && !full.data) {
    return (
      <div className="wrap" style={{ padding: "64px 0" }}>
        <EmptyState
          title={full.error.code === "LOT_NOT_FOUND" ? t.room.notFoundTitle : errorText(full.error)}
          text={full.error.code === "LOT_NOT_FOUND" ? t.room.notFoundText : undefined}
          action={
            <Link className="btn btn-dark" href={href("/lots")}>
              {t.room.goShowcase}
            </Link>
          }
        />
      </div>
    )
  }

  if (!full.data || !room) {
    return (
      <div className="wrap mt32">
        <div className="room">
          <div className="skeleton" style={{ height: 420 }} />
          <div>
            <div className="skeleton" style={{ height: 40, width: "60%" }} />
            <div className="skeleton mt16" style={{ height: 140 }} />
            <div className="skeleton mt16" style={{ height: 80 }} />
          </div>
        </div>
      </div>
    )
  }

  const lot = full.data.lot
  const title = lot.title ?? t.common.untitled

  if (room.state === "cancelled") {
    return (
      <div className="wrap" style={{ padding: "64px 0" }}>
        <div className="panel center" style={{ padding: 40 }} data-testid="room-cancelled">
          <span className="chip bad">{t.room.cancelledTitle}</span>
          <div className="serif mt8" style={{ fontSize: 22 }}>
            {title}
          </div>
          <p className="muted">{t.room.cancelledText}</p>
          <Link className="btn btn-outline" href={href("/lots")}>
            {t.room.otherLots}
          </Link>
        </div>
      </div>
    )
  }

  const user = session.user
  const viewer = room.viewer
  const isLive = room.state === "live"
  const isClosedish = room.state === "closed" || room.state === "ended"
  const canBidRole = session.can("bid.place")
  const isSeller = !!viewer?.isSeller
  const leading = viewer?.position === "leading"
  const connected = live.connected && full.connected
  const remainingMs = nowMs === null ? null : Date.parse(isLive ? room.endsAt : room.startsAt) - nowMs
  const hot = isLive && remainingMs !== null && remainingMs <= RULES.EXTENSION_WINDOW_MS
  const extensions = Math.round(room.extendedMs / RULES.EXTENSION_STEP_MS)
  const minimum = room.minimumBidCents
  const plain = plainMoney

  const bidDisabled = !hydrated || !connected || !isLive || leading || submitting || isSeller || !canBidRole

  async function submitBid(event?: React.FormEvent) {
    event?.preventDefault()
    if (minimum === null) return
    setBidError(null)

    const cents = amountText.trim() ? parseMoney(amountText) : minimum
    if (cents === null || cents <= 0) return setBidError(t.room.invalidAmount)
    if (cents < minimum) return setBidError(t.room.belowMinimum(money(minimum)))

    setSubmitting(true)
    try {
      // Mesma chave até o lance dar certo (ou o valor mudar): reenviar depois de uma falha de
      // rede não grava dois lances
      if (!bidKey.current || bidKey.current.cents !== cents) bidKey.current = { cents, key: newIdempotencyKey() }
      const response = await send<BidResponse>(`/api/lots/${id}/bids`, { amountCents: cents, idempotencyKey: bidKey.current.key })
      bidKey.current = null
      live.setData(response.room)
      setAmountText("")
      toast.show({ title: t.room.toastAccepted, text: t.room.toastAcceptedText(title, money(cents)) })
      await session.refresh()
    } catch (error) {
      setBidError(errorText(error))
      if (error instanceof ApiError && error.code.startsWith("BID_")) void live.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  function banner() {
    if (!connected) return { tone: "warn", title: t.room.reconnectingTitle, text: t.room.reconnectingText }
    if (room!.state === "scheduled") return { tone: "info", title: t.room.scheduledTitle, text: t.room.scheduledText(dateTime(room!.startsAt)) }
    if (room!.state === "ended") return { tone: "info", title: t.room.endingTitle, text: t.room.endingText }
    if (room!.state === "closed") return null
    if (!user) return { tone: "info", title: t.room.visitorTitle, text: t.room.visitorText }
    if (isSeller) return { tone: "info", title: t.room.sellerTitle, text: t.room.sellerText }
    if (!canBidRole) return { tone: "bad", title: errorText(new ApiError("BID_AUCTIONEER_NOT_ALLOWED", 403)), text: t.room.sellerText }
    if (leading) return { tone: "ok", title: t.room.winningTitle, text: t.room.winningText(money(room!.currentBidCents ?? 0)) }
    if (viewer?.position === "outbid") return { tone: "warn", title: t.room.outbidTitle, text: t.room.outbidText }
    return { tone: "info", title: t.room.noBidTitle, text: t.room.noBidText(money(session.wallet?.availableCents ?? 0)) }
  }

  const currentBanner = banner()
  const attrs: [string, string][] = [
    [t.room.attrs.set, lot.setName ?? "—"],
    [t.room.attrs.rarity, lot.rarity ?? "—"],
    [t.room.attrs.released, lot.releasedAt ?? "—"],
    [t.room.attrs.source, t.common.scryfall],
    ...lot.attributes
      .filter((attr) => attr.key !== "set")
      .map((attr): [string, string] => [(t.room.attrs as Record<string, string>)[attr.key] ?? attr.key, attr.value]),
  ]

  return (
    <div className="wrap" data-testid="room" data-state={room.state}>
      <div className="crumbs">
        <Link href={href("/lots")}>{t.room.crumbs}</Link> &nbsp;/&nbsp; {t.state[room.state]} &nbsp;/&nbsp; {title}
      </div>

      <div className="room">
        <div>
          <div className="stage">
            <CardImage src={lot.imageUrl} alt={title} />
          </div>
          <div className="attrs">
            {attrs.map(([key, value]) => (
              <div key={key}>
                <span>{key}</span>
                {value}
              </div>
            ))}
          </div>
          <div className="credit">{t.room.credit}</div>
        </div>

        <div>
          <div className="row between">
            {isLive ? <span className="chip live">{t.state.liveBadge}</span> : <span className="chip">{t.state[room.state]}</span>}
            {!isClosedish && (
              <span className={`conn ${connected ? "" : "off"}`} data-testid="room-connection">
                {!connected ? t.room.connLost : user ? t.room.connLive : t.room.connVisitor}
              </span>
            )}
          </div>
          <h1 className="mt8">{title}</h1>
          <div className="muted">
            {[lotSubtitle(lot), t.room.seller(lot.seller.name)].filter(Boolean).join(" · ")}
          </div>

          <div className="price-box mt16">
            <div className="label">
              {room.state === "closed" && room.outcome === "SOLD" ? t.room.finalBid : room.bidCount > 0 ? t.room.currentBid : t.room.startingBid}
            </div>
            <div className="big" data-testid="room-current-bid">
              {money(room.currentBidCents ?? lot.startingBidCents)}
            </div>
            <div className="stats">
              <div>
                <small>{t.room.minimumNow}</small>
                <b data-testid="room-minimum">{minimum !== null ? money(minimum) : "—"}</b>
              </div>
              <div>
                <small>{t.room.increment}</small>
                <b>{money(lot.minIncrementCents)}</b>
              </div>
              <div>
                <small>{t.room.bids}</small>
                <b data-testid="room-bid-count">{room.bidCount}</b>
              </div>
            </div>
          </div>

          <div className="mt16">
            {isClosedish ? (
              <div className="timer">
                <div>
                  <small>{t.room.endedAt}</small>
                  <div className="digits" style={{ fontSize: 22 }}>
                    {dateTime(room.endsAt)}
                  </div>
                </div>
                {extensions > 0 && <small className="right">{t.room.extendedTimes(extensions)}</small>}
              </div>
            ) : (
              <div className={`timer ${hot ? "hot" : ""}`} data-testid="room-timer">
                <div>
                  <small>{isLive ? t.room.endsIn : t.room.startsIn}</small>
                  <div className="digits">
                    {formatRemaining(remainingMs)}
                    {isLive && room.extendedMs > 0 && (
                      <span className="ext" data-testid="room-extended">
                        {t.room.extended(room.extendedMs / MINUTE)}
                      </span>
                    )}
                  </div>
                </div>
                <small className="right">
                  {t.room.currentEnd(time(room.endsAt))}
                  <br />
                  {t.room.serverClock}
                </small>
              </div>
            )}
          </div>

          {currentBanner && (
            <div className="mt16">
              <div className={`banner ${currentBanner.tone}`} data-testid="room-banner" data-position={viewer?.position ?? "visitor"}>
                <div>
                  <b>{currentBanner.title}</b>
                  {currentBanner.text}
                </div>
              </div>
            </div>
          )}

          {room.state === "closed" && (
            <div className="panel dark mt24" data-testid="room-result">
              <div className="label" style={{ color: "var(--gold-2)" }}>
                {t.room.resultLabel}
              </div>
              {room.outcome === "SOLD" ? (
                leading ? (
                  <>
                    <h2 style={{ margin: "8px 0 4px", color: "var(--cream)" }}>{t.room.youWon}</h2>
                    <p style={{ margin: "0 0 16px", color: "var(--on-ink-soft)" }}>{t.room.youWonText(money(room.currentBidCents ?? 0), time(room.endsAt))}</p>
                  </>
                ) : (
                  <>
                    <h2 style={{ margin: "8px 0 4px", color: "var(--cream)" }}>{t.room.soldTitle}</h2>
                    <p style={{ margin: "0 0 16px", color: "var(--on-ink-soft)" }}>{t.room.soldText(money(room.currentBidCents ?? 0))}</p>
                  </>
                )
              ) : (
                <>
                  <h2 style={{ margin: "8px 0 4px", color: "var(--cream)" }}>{t.room.unsoldTitle}</h2>
                  <p style={{ margin: "0 0 16px", color: "var(--on-ink-soft)" }}>{t.room.unsoldText}</p>
                </>
              )}
              <div className="row wrap-row">
                {room.receiptCode && (
                  <Link className="btn btn-gold" href={href(`/receipts/${room.receiptCode}`)} data-testid="room-receipt-link">
                    {t.room.seeReceipt}
                  </Link>
                )}
                <CopyLinkButton className="btn btn-ghost" label={t.room.shareLink} />
              </div>
            </div>
          )}

          {(isLive || room.state === "scheduled") && (
            <div className="mt24 bid-dock">
              {!user ? (
                <div className="bidform">
                  <div className="input disabled">
                    <span className="cur">R$</span>
                    <span>{minimum !== null ? plain(minimum) : ""}</span>
                  </div>
                  <Link className="btn btn-dark btn-lg" href={`${href("/login")}?next=${encodeURIComponent(`/lots/${id}`)}`} data-testid="room-login-to-bid">
                    {t.room.loginToBid}
                  </Link>
                </div>
              ) : canBidRole && !isSeller ? (
                <form onSubmit={submitBid}>
                  <div className="bidform">
                    <label className={`input ${bidError ? "err" : ""} ${bidDisabled ? "disabled" : ""}`}>
                      <span className="cur">R$</span>
                      <span className="sr-only">{t.room.amountLabel}</span>
                      <input
                        inputMode="decimal"
                        value={amountText}
                        placeholder={minimum !== null ? plain(minimum) : ""}
                        onChange={(event) => setAmountText(event.target.value)}
                        disabled={bidDisabled}
                        data-testid="room-bid-input"
                      />
                    </label>
                    <button className="btn btn-dark btn-lg" type="submit" disabled={bidDisabled} data-testid="room-bid-submit">
                      {submitting ? t.auth.submitting : t.room.placeBid}
                    </button>
                  </div>
                  {bidError && (
                    <div className="hint err mt8" role="alert" data-testid="room-bid-error">
                      {bidError}
                    </div>
                  )}
                  {leading && <div className="hint mt8">{t.room.alreadyLeading}</div>}
                  {!connected && <div className="hint mt8">{t.room.unavailableReconnecting}</div>}
                  {isLive && !leading && connected && minimum !== null && (
                    <div className="row between mt8 wrap-row">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setAmountText(plain(minimum))} data-testid="room-min-button">
                        {t.room.minimumButton(money(minimum))}
                      </button>
                      <span className="hint">
                        {t.room.available} <b>{money(session.wallet?.availableCents ?? 0)}</b>
                        {(session.wallet?.availableCents ?? 0) < minimum && (
                          <>
                            {" · "}
                            <Link className="gold" href={href("/wallet")}>
                              {t.room.depositToBid}
                            </Link>
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </form>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="section" style={{ marginTop: 36 }}>
        <div className="section-head">
          <span className="label">{t.room.history}</span>
          <Link className="hint" href={href(`/lots/${id}/audit`)} data-testid="room-audit-link">
            {t.room.seeAudit}
          </Link>
        </div>
        <div className="panel table-scroll" style={{ padding: 0 }}>
          {room.recentBids.length === 0 ? (
            <p className="muted center" style={{ padding: 20, margin: 0 }}>
              {t.room.noBidsYet}
            </p>
          ) : (
            <table className="t" data-testid="room-history">
              <thead>
                <tr>
                  <th>{t.room.colSeq}</th>
                  <th>{t.room.colBidder}</th>
                  <th>{t.room.colAmount}</th>
                  <th>{t.room.colTime}</th>
                </tr>
              </thead>
              <tbody>
                {room.recentBids.map((bid) => (
                  <tr key={bid.seq} className={bid.bidder === "you" ? "me" : ""}>
                    <td>#{bid.seq}</td>
                    <td>{bid.bidder === "you" ? t.common.you : t.common.bidder(bid.bidder)}</td>
                    <td>
                      <b>{money(bid.amountCents)}</b>
                    </td>
                    <td className="muted">{time(bid.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
