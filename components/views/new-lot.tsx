"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { RULES } from "@/lib/rules"
import { ApiError, useApi, useHydrated } from "@/lib/client/api"
import { useI18n, useToast } from "@/components/providers"
import { CardImage, lotSubtitle, PageHeader } from "@/components/ui"
import type { CatalogSearchResult, CatalogItem } from "@/server/catalog"

type Step = 0 | 1 | 2
type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "results"; items: CatalogSearchResult[] }
  | { kind: "down"; recent: CatalogItem[] }
  | { kind: "limited"; retryAfterSec: number }
  | { kind: "error"; message: string }

// <input type="datetime-local"> trabalha no fuso do navegador
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function roundedFuture(minutes: number): Date {
  const date = new Date(Date.now() + minutes * 60_000)
  date.setSeconds(0, 0)
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5)
  return date
}

export function NewLotView() {
  const { t, money, dateTime, href, errorText, parseMoney, plainMoney } = useI18n()
  const { get, send } = useApi()
  const toast = useToast()
  const router = useRouter()

  const [step, setStep] = useState<Step>(0)
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState<SearchState>({ kind: "idle" })
  const [item, setItem] = useState<CatalogItem | null>(null)

  const [startingBid, setStartingBid] = useState("")
  const [increment, setIncrement] = useState("")
  const [startNow, setStartNow] = useState(true)
  // Sugestões de início e fim são preenchidas ao escolher a carta (evento do clique): a
  // renderização não pode ler a hora atual (Cache Components)
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [fields, setFields] = useState<Record<string, string>>({})
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const hydrated = useHydrated()
  // "Agora" capturado ao ir para a revisão (render não pode chamar Date.now)
  const [reviewNow, setReviewNow] = useState(0)

  async function runSearch(event: React.FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    setSearch({ kind: "loading" })
    try {
      const result = await get<{ items: CatalogSearchResult[] }>(`/api/catalog/search?q=${encodeURIComponent(query.trim())}`)
      setSearch({ kind: "results", items: result.items })
    } catch (error) {
      if (error instanceof ApiError && error.code === "SEARCH_UNAVAILABLE") {
        setSearch({ kind: "down", recent: (error.data?.recent as CatalogItem[]) ?? [] })
      } else if (error instanceof ApiError && error.code === "SEARCH_RATE_LIMITED") {
        setSearch({ kind: "limited", retryAfterSec: Number(error.data?.retryAfterSec ?? 10) })
      } else {
        setSearch({ kind: "error", message: errorText(error) })
      }
    }
  }

  function choose(chosen: CatalogItem) {
    setItem(chosen)
    if (!startsAt) setStartsAt(toLocalInput(roundedFuture(15)))
    if (!endsAt) setEndsAt(toLocalInput(roundedFuture(60)))
    setStep(1)
  }

  // Validação local das condições; o servidor valida de novo e devolve os mesmos códigos
  function buildPayload() {
    const found: Record<string, string> = {}
    const startingBidCents = parseMoney(startingBid)
    const minIncrementCents = parseMoney(increment)
    const start = startNow ? null : new Date(startsAt)
    const end = new Date(endsAt)
    const effectiveStart = start ?? new Date()

    if (startingBidCents === null || startingBidCents <= 0) found.startingBidCents = "INVALID_MONEY"
    if (minIncrementCents === null || minIncrementCents <= 0) found.minIncrementCents = "INVALID_MONEY"
    if (start && Number.isNaN(start.getTime())) found.startsAt = "INVALID_DATE"
    else if (start && start.getTime() < Date.now()) found.startsAt = "IN_THE_PAST"
    if (Number.isNaN(end.getTime())) found.endsAt = "INVALID_DATE"
    else if (end.getTime() <= effectiveStart.getTime()) found.endsAt = "MUST_BE_AFTER_START"
    else if (end.getTime() - effectiveStart.getTime() < RULES.LOT_MIN_DURATION_MS) found.endsAt = "DURATION_TOO_SHORT"

    setFields(found)
    if (Object.keys(found).length > 0 || !item) return null

    return {
      sourceItemId: item.sourceId,
      startingBidCents: startingBidCents!,
      minIncrementCents: minIncrementCents!,
      startsAt: start ? start.toISOString() : null,
      endsAt: end.toISOString(),
    }
  }

  async function publish() {
    const payload = buildPayload()
    if (!payload) return setStep(1)

    setPublishing(true)
    setPublishError(null)
    try {
      const result = await send<{ lot: { id: string } }>("/api/lots", payload)
      toast.show({ title: t.newLot.published })
      router.push(href(`/lots/${result.lot.id}`))
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION_FAILED" && error.data?.fields) {
        const serverFields = error.data.fields as Record<string, string[]>
        setFields(Object.fromEntries(Object.entries(serverFields).map(([key, codes]) => [key, codes[0]])))
        setStep(1)
      } else {
        setPublishError(errorText(error))
      }
    } finally {
      setPublishing(false)
    }
  }

  const fieldError = (key: string) =>
    fields[key] ? (
      <span className="hint err" data-testid={`field-error-${key}`}>
        {t.newLot.fieldErrors[fields[key]] ?? fields[key]}
      </span>
    ) : null

  const durationMs = new Date(endsAt).getTime() - (startNow ? reviewNow : new Date(startsAt).getTime())
  const durationText = (() => {
    const minutes = Math.max(0, Math.round(durationMs / 60_000))
    const hours = Math.floor(minutes / 60)
    return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`
  })()

  const titles = [t.newLot.searchTitle, t.newLot.conditionsTitle, t.newLot.reviewTitle]
  const itemTitle = item?.title ?? t.common.untitled

  return (
    <div className="wrap" data-testid="new-lot" data-step={step}>
      <PageHeader eyebrow={t.newLot.label} title={titles[step]} subtitle={step === 0 ? t.newLot.subtitle : undefined} />

      <div className="wizard mt24" aria-label={t.newLot.label}>
        {t.newLot.steps.map((label, index) => (
          <div key={label} className={`wstep ${index <= step ? "reached" : ""} ${index < step ? "done" : ""}`}>
            <span className="num">{index + 1}</span>
            <b className="hide-mobile">{label}</b>
          </div>
        ))}
      </div>

      {step === 0 && (
        <>
          <form className="row mt24" onSubmit={runSearch}>
            <label className="input grow">
              <span className="sr-only">{t.newLot.searchPlaceholder}</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.newLot.searchPlaceholder} data-testid="catalog-query" />
            </label>
            <button className="btn btn-dark" type="submit" disabled={!hydrated || search.kind === "loading"} data-testid="catalog-search">
              {search.kind === "loading" ? t.common.loading : t.newLot.search}
            </button>
          </form>

          {search.kind === "down" && (
            <>
              <div className="banner warn mt16" data-testid="catalog-down">
                <div>
                  <b>{t.newLot.sourceDownTitle}</b>
                  {t.newLot.sourceDownText}
                </div>
              </div>
              {search.recent.length > 0 && (
                <>
                  <div className="section" style={{ marginTop: 28 }}>
                    <span className="label">{t.newLot.recent}</span>
                  </div>
                  <div className="grid-4 mt16">
                    {search.recent.map((card) => (
                      <div className="lot" key={card.sourceId}>
                        <div className="thumb" style={{ aspectRatio: "1/1.1" }}>
                          <span className="badge sand">{t.newLot.fromPrevious}</span>
                          <CardImage src={card.imageUrl} alt={card.title ?? t.common.untitled} />
                        </div>
                        <div className="meta" style={{ marginTop: 12 }}>
                          <div>
                            <div className="name">{card.title ?? t.common.untitled}</div>
                            <div className="sub">{lotSubtitle(card)}</div>
                          </div>
                        </div>
                        <div className="mt8">
                          <button className="btn btn-outline btn-sm btn-block" onClick={() => choose(card)}>
                            {t.newLot.chooseShort}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {search.kind === "limited" && (
            <div className="banner warn mt16">
              <div>
                <b>{t.newLot.rateLimitedTitle}</b>
                {t.newLot.rateLimitedText(search.retryAfterSec)}
              </div>
            </div>
          )}

          {search.kind === "error" && (
            <div className="banner bad mt16" role="alert">
              <div>{search.message}</div>
            </div>
          )}

          {search.kind === "results" && (
            <>
              <div className="row between mt24">
                <span className="hint">{search.items.length === 0 ? t.newLot.noResults : t.newLot.results(search.items.length)}</span>
              </div>
              <div className="grid-4 mt16" data-testid="catalog-results">
                {search.items.map((card) => (
                  <div className="lot" key={card.sourceId} data-testid="catalog-item">
                    <div className="thumb" style={{ aspectRatio: "1/1.1" }}>
                      {card.inAuction && <span className="badge">{t.newLot.inAuction}</span>}
                      <CardImage src={card.imageUrl} alt={card.title ?? t.common.untitled} />
                    </div>
                    <div className="meta" style={{ marginTop: 12 }}>
                      <div>
                        <div className="name">{card.title ?? t.common.untitled}</div>
                        <div className="sub">{lotSubtitle(card)}</div>
                      </div>
                    </div>
                    <div className="mt8">
                      {card.inAuction ? (
                        <button className="btn btn-outline btn-sm btn-block" disabled>
                          {t.newLot.alreadyInAuction}
                        </button>
                      ) : (
                        <button className="btn btn-dark btn-sm btn-block" onClick={() => choose(card)} data-testid="catalog-choose">
                          {t.newLot.choose}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {step === 1 && item && (
        <form
          className="row mt24 stack-mobile"
          style={{ alignItems: "flex-start", gap: 40 }}
          onSubmit={(event) => {
            event.preventDefault()
            if (buildPayload()) {
              setReviewNow(Date.now())
              setStep(2)
            }
          }}
          noValidate
        >
          <div style={{ width: 280 }}>
            <div className="stage" style={{ height: 340 }}>
              <CardImage src={item.imageUrl} alt={itemTitle} />
            </div>
            <h3 className="mt16">{itemTitle}</h3>
            <div className="muted" style={{ fontSize: 12 }}>
              {[lotSubtitle(item), item.rarity].filter(Boolean).join(" · ")}
            </div>
            <div className="credit">{t.newLot.copied}</div>
            <button type="button" className="btn btn-outline btn-sm mt16" onClick={() => setStep(0)}>
              {t.newLot.changeItem}
            </button>
          </div>

          <div className="grow">
            <div className="row stack-mobile">
              <div className="field grow">
                <label htmlFor="startingBid">{t.newLot.startingBid}</label>
                <label className={`input ${fields.startingBidCents ? "err" : ""}`}>
                  <span className="muted">R$</span>
                  <input id="startingBid" inputMode="decimal" value={startingBid} onChange={(e) => setStartingBid(e.target.value)} placeholder={plainMoney(60_000)} data-testid="lot-starting-bid" />
                </label>
                {fieldError("startingBidCents")}
              </div>
              <div className="field grow">
                <label htmlFor="increment">{t.newLot.increment}</label>
                <label className={`input ${fields.minIncrementCents ? "err" : ""}`}>
                  <span className="muted">R$</span>
                  <input id="increment" inputMode="decimal" value={increment} onChange={(e) => setIncrement(e.target.value)} placeholder={plainMoney(5_000)} data-testid="lot-increment" />
                </label>
                {fieldError("minIncrementCents")}
              </div>
            </div>

            <div className="field">
              <label>{t.newLot.when}</label>
              <div className="seg" role="radiogroup">
                <button type="button" role="radio" aria-checked={startNow} className={startNow ? "on" : ""} onClick={() => setStartNow(true)} data-testid="lot-start-now">
                  {t.newLot.startNow}
                </button>
                <button type="button" role="radio" aria-checked={!startNow} className={!startNow ? "on" : ""} onClick={() => setStartNow(false)} data-testid="lot-schedule">
                  {t.newLot.schedule}
                </button>
              </div>
            </div>

            <div className="row stack-mobile">
              {!startNow && (
                <div className="field grow">
                  <label htmlFor="startsAt">{t.newLot.startAt}</label>
                  <input id="startsAt" type="datetime-local" className={`input ${fields.startsAt ? "err" : ""}`} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} data-testid="lot-starts-at" />
                  {fieldError("startsAt")}
                </div>
              )}
              <div className="field grow">
                <label htmlFor="endsAt">{t.newLot.endAt}</label>
                <input id="endsAt" type="datetime-local" className={`input ${fields.endsAt ? "err" : ""}`} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} data-testid="lot-ends-at" />
                {fieldError("endsAt")}
              </div>
            </div>
            <div className="hint mb16">{t.newLot.timezone}</div>

            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" onClick={() => setStep(0)}>
                {t.common.back}
              </button>
              <button type="submit" className="btn btn-dark" disabled={!hydrated} data-testid="lot-to-review">
                {t.newLot.toReview}
              </button>
            </div>
          </div>
        </form>
      )}

      {step === 2 && item && (
        <div className="row mt24 stack-mobile" style={{ alignItems: "flex-start", gap: 40 }}>
          <div className="panel grow">
            <div className="row stack-mobile" style={{ gap: 20 }}>
              <div className="stage" style={{ width: 130, height: 170, padding: 10, flex: "none" }}>
                <CardImage src={item.imageUrl} alt={itemTitle} />
              </div>
              <div className="kv grow">
                <span>{t.newLot.item}</span>
                <b style={{ fontFamily: "var(--sans)" }}>{[itemTitle, item.setName].filter(Boolean).join(" · ")}</b>
                <span>{t.newLot.startingBid}</span>
                <div>{money(parseMoney(startingBid) ?? 0)}</div>
                <span>{t.newLot.increment}</span>
                <div>{money(parseMoney(increment) ?? 0)}</div>
                <span>{t.newLot.opensAt}</span>
                <div>
                  <b>{startNow ? t.newLot.now : dateTime(new Date(startsAt).toISOString())}</b>
                </div>
                <span>{t.newLot.endsAt}</span>
                <div>
                  <b>{dateTime(new Date(endsAt).toISOString())}</b>
                </div>
                <span>{t.newLot.duration}</span>
                <div>{t.newLot.durationText(durationText)}</div>
              </div>
            </div>
          </div>
          <div className="aside-320" style={{ width: 340 }}>
            <div className="banner warn">
              <div>
                <b>{t.newLot.noEditTitle}</b>
                {t.newLot.noEditText}
              </div>
            </div>
            {publishError && (
              <div className="banner bad mt16" role="alert" data-testid="publish-error">
                <div>{publishError}</div>
              </div>
            )}
            <button className="btn btn-dark btn-lg btn-block mt16" onClick={publish} disabled={publishing} data-testid="lot-publish">
              {publishing ? t.auth.submitting : t.newLot.publish}
            </button>
            <button className="btn btn-outline btn-lg btn-block mt8" onClick={() => setStep(1)}>
              {t.newLot.adjust}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
