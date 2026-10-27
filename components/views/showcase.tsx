"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { RULES } from "@/lib/rules"
import { usePolled, useServerNow } from "@/lib/client/api"
import { useI18n } from "@/components/providers"
import { EmptyState, LotCard, LotGridSkeleton, Pagination, type LotSummary, PageHeader } from "@/components/ui"

type Tab = "live" | "scheduled" | "ended"
const TABS: Tab[] = ["live", "scheduled", "ended"]

type Showcase = { items: LotSummary[]; page: number; total: number; totalPages: number; serverNow: string }

function showcaseUrl(pathname: string, tab: Tab, page: number, query: string): string {
  const search = new URLSearchParams({ tab })
  if (page > 1) search.set("page", String(page))
  if (query) search.set("q", query)
  return `${pathname}?${search}`
}

export function ShowcaseView() {
  const { t, href, errorText } = useI18n()
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tabParam = params.get("tab")
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "live"
  const page = Math.max(1, Number(params.get("page")) || 1)
  const query = (params.get("q") ?? "").trim()

  // O campo acompanha o ?q= (a busca do topo também muda a URL)
  const [filter, setFilter] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  if (syncedQuery !== query) {
    setSyncedQuery(query)
    setFilter(query)
  }

  const { data, error, refresh } = usePolled<Showcase>(
    `/api/lots?tab=${tab}&page=${page}${query ? `&q=${encodeURIComponent(query)}` : ""}`,
    RULES.POLL_SHOWCASE_MS,
  )
  const nowMs = useServerNow(data?.serverNow)

  const go = (nextTab: Tab, nextPage = 1) => router.push(showcaseUrl(pathname, nextTab, nextPage, query))

  // Busca no servidor (todas as páginas) depois de uma pausa na digitação
  useEffect(() => {
    const next = filter.trim()
    if (next === query) return
    const timer = setTimeout(() => router.replace(showcaseUrl(pathname, tab, 1, next)), 350)
    return () => clearTimeout(timer)
  }, [filter, query, tab, pathname, router])

  const items = data?.items ?? []

  return (
    <div className="wrap">
      <PageHeader eyebrow={t.showcase.label} title={t.showcase.title} subtitle={t.showcase.subtitle} />

      <div className="tabs mt24" role="tablist">
        {TABS.map((item) => (
          <button key={item} role="tab" aria-selected={item === tab} className={item === tab ? "on" : ""} onClick={() => go(item)} data-testid={`tab-${item}`}>
            {t.showcase.tabs[item]}
            {item === tab && data ? ` (${data.total})` : ""}
          </button>
        ))}
      </div>

      <div className="row mt16">
        <label className="input grow">
          <span className="sr-only">{t.showcase.filter}</span>
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={t.showcase.filter}
            maxLength={80}
            data-testid="showcase-search"
          />
        </label>
      </div>

      <div className="row between mt24">
        <span className="hint">{t.showcase.orderedBy[tab]}</span>
        {data && <span className="hint">{t.showcase.count(data.total)}</span>}
      </div>

      <div className="mt16">
        {error && !data ? (
          <EmptyState title={errorText(error)} action={<button className="btn btn-dark" onClick={refresh}>{t.common.retry}</button>} />
        ) : !data ? (
          <LotGridSkeleton count={8} />
        ) : items.length === 0 && query ? (
          <EmptyState title={t.showcase.noMatch(query)} text={t.showcase.noMatchText} />
        ) : items.length === 0 ? (
          <EmptyState
            title={t.showcase.empty[tab]}
            text={t.showcase.emptyText[tab]}
            action={
              tab === "live" && (
                <Link className="btn btn-dark" href={href("/lots?tab=scheduled")}>
                  {t.showcase.seeScheduled}
                </Link>
              )
            }
          />
        ) : (
          <div className="grid-4" data-testid="showcase-grid">
            {items.map((lot) => (
              <LotCard key={lot.id} lot={lot} nowMs={nowMs} />
            ))}
          </div>
        )}
      </div>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPage={(next) => go(tab, next)} />}
    </div>
  )
}
