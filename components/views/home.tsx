"use client"

import Link from "next/link"
import { RULES } from "@/lib/rules"
import { usePolled, useServerNow } from "@/lib/client/api"
import { useI18n } from "@/components/providers"
import { CardImage, EmptyState, formatRemaining, LotCard, LotGridSkeleton, lotSubtitle, type LotSummary } from "@/components/ui"

type Showcase = { items: LotSummary[]; total: number; serverNow: string }

function Row({ label, tab, data, nowMs }: { label: string; tab: string; data: Showcase | null; nowMs: number | null }) {
  const { t, href } = useI18n()
  if (data && data.items.length === 0) return null

  return (
    <section className="section" data-testid={`home-${tab}`}>
      <div className="section-head">
        <span className="label">{label}</span>
        <Link className="hint" href={href(`/lots?tab=${tab}`)}>
          {t.home.seeAll}
        </Link>
      </div>
      {!data ? (
        <LotGridSkeleton />
      ) : (
        <div className="grid-4">
          {data.items.slice(0, 4).map((lot) => (
            <LotCard key={lot.id} lot={lot} nowMs={nowMs} />
          ))}
        </div>
      )}
    </section>
  )
}

export function HomeView() {
  const { t, money, href } = useI18n()
  const live = usePolled<Showcase>("/api/lots?tab=live", RULES.POLL_SHOWCASE_MS)
  const scheduled = usePolled<Showcase>("/api/lots?tab=scheduled", RULES.POLL_SHOWCASE_MS)
  const ended = usePolled<Showcase>("/api/lots?tab=ended", RULES.POLL_SHOWCASE_MS)
  const nowMs = useServerNow(live.data?.serverNow)

  // Destaque: o lote ao vivo que termina primeiro
  const featured = live.data?.items[0]

  return (
    <div className="wrap">
      {featured ? (
        <section className="hero" data-testid="home-featured">
          <Link className="stage" href={href(`/lots/${featured.id}`)}>
            <CardImage src={featured.imageUrl} alt={featured.title ?? t.common.untitled} />
          </Link>
          <div>
            <div className="label">{t.home.featured}</div>
            <h1 className="mt8">{featured.title ?? t.common.untitled}</h1>
            <div className="muted mt8">{lotSubtitle(featured)}</div>
            <p className="mt16">{t.home.featuredText(featured.bidCount)}</p>
            <div className="bid-line">
              <div>
                <small>{featured.bidCount > 0 ? t.home.currentBid : t.home.startingBid}</small>
                <b>{money(featured.currentBidCents ?? featured.startingBidCents)}</b>
              </div>
              <div>
                <small>{t.home.endsIn}</small>
                <b>{formatRemaining(nowMs === null ? null : Date.parse(featured.endsAt) - nowMs)}</b>
              </div>
            </div>
            <div className="row wrap-row">
              <Link className="btn btn-dark btn-lg" href={href(`/lots/${featured.id}`)}>
                {t.home.placeBid}
              </Link>
              <Link className="btn btn-outline btn-lg" href={href("/lots")}>
                {t.home.details}
              </Link>
            </div>
          </div>
        </section>
      ) : (
        live.data && (
          <section className="mt32">
            <EmptyState
              title={t.home.emptyHero}
              text={t.home.emptyHeroText}
              action={
                <Link className="btn btn-dark" href={href("/lots?tab=scheduled")}>
                  {t.showcase.seeScheduled}
                </Link>
              }
            />
          </section>
        )
      )}

      <Row label={t.home.live} tab="live" data={live.data} nowMs={nowMs} />
      <Row label={t.home.scheduled} tab="scheduled" data={scheduled.data} nowMs={nowMs} />
      <Row label={t.home.recentlyEnded} tab="ended" data={ended.data} nowMs={nowMs} />

      <section className="section" id="how">
        <div className="section-head">
          <span className="label">{t.nav.howItWorks}</span>
        </div>
        <div className="steps">
          {t.home.steps.map((step, index) => (
            <div className="step" key={step.title}>
              <div className="ico">{index + 1}</div>
              <b>{step.title}</b>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
