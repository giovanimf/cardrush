import Link from "next/link"
import type { Locale } from "@/lib/i18n"
import { PresentationVideo } from "@/components/presentation-video"
import { PRESENTATION, type Status } from "@/components/views/presentation-content"

const STATUS_CHIP: Record<Status, string> = { done: "ok", partial: "warn", todo: "bad" }

// Bloco com título de seção (mesmo padrão das outras telas)
function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section className="section" id={id}>
      <div className="section-head">
        <h2 className="label">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function CardGrid({ items }: { items: { title: string; text: string }[] }) {
  return (
    <div className="pres-cards">
      {items.map((item) => (
        <div key={item.title} className="panel">
          <h3>{item.title}</h3>
          <p className="muted">{item.text}</p>
        </div>
      ))}
    </div>
  )
}

// Página pública de apresentação: sem dados do banco, só texto e o vídeo
export function PresentationView({ lang }: { lang: Locale }) {
  const c = PRESENTATION[lang]
  const href = (path: string) => `/${lang}${path}`

  return (
    <div className="wrap pres">
      <header className="pres-hero">
        <div className="label">{c.hero.eyebrow}</div>
        <h1>{c.hero.title}</h1>
        <p>{c.hero.lead}</p>
        <div className="row wrap-row mt24">
          <Link className="btn btn-gold btn-lg" href={href("/lots?tab=live")}>
            {c.hero.ctaLots}
          </Link>
          <a className="btn btn-outline btn-lg" href="#roteiro">
            {c.hero.ctaTour}
          </a>
        </div>
      </header>

      <Section title={c.video.title}>
        <p className="muted pres-lead">{c.video.hint}</p>
        <PresentationVideo chapters={c.video.chapters} fallback={c.video.fallback} download={c.video.download} />
      </Section>

      <div className="pres-numbers mt48">
        {c.numbers.map((item) => (
          <div key={item.label} className="stat">
            <div className="v">{item.value}</div>
            <small>{item.label}</small>
          </div>
        ))}
      </div>

      <Section title={c.context.title}>
        <div className="pres-split">
          <div className="pres-prose">
            {c.context.paragraphs.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
          <div className="pres-roles">
            {c.context.roles.map((role) => (
              <div key={role.name} className="panel beige">
                <b>{role.name}</b>
                <p className="muted">{role.text}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title={c.ai.title}>
        <div className="pres-prose">
          <p>{c.ai.intro}</p>
        </div>

        <h3 className="pres-subtitle">{c.ai.organizedTitle}</h3>
        <ol className="pres-steps">
          {c.ai.organized.map((item) => (
            <li key={item.title}>
              <div>
                <b>{item.title}</b>
                {item.ref && <code className="pres-ref">{item.ref}</code>}
                <p className="muted">{item.text}</p>
                {item.note && (
                  <p className="pres-note">
                    <b>{item.note.title}:</b> {item.note.text}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>

        <h3 className="pres-subtitle">{c.ai.conductedTitle}</h3>
        <div className="pres-cards">
          {c.ai.conducted.map((item) => (
            <div key={item.title} className="panel">
              <h3>{item.title}</h3>
              <p className="muted">{item.text}</p>
              {item.ref && <code className="pres-ref">{item.ref}</code>}
            </div>
          ))}
        </div>

        <h3 className="pres-subtitle">{c.ai.toolsTitle}</h3>
        <div className="panel pres-table">
          <div className="table-scroll">
            <table className="t">
              <thead>
                <tr>
                  <th>{c.ai.toolsColumns.tool}</th>
                  <th>{c.ai.toolsColumns.use}</th>
                </tr>
              </thead>
              <tbody>
                {c.ai.tools.map((tool) => (
                  <tr key={tool.name} className="pres-tool">
                    <td className="pres-need">
                      {tool.name}
                      {tool.where && <code className="pres-ref">{tool.where}</code>}
                    </td>
                    <td>{tool.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <h3 className="pres-subtitle">{c.ai.videoTitle}</h3>
        <p className="muted pres-lead">{c.ai.videoIntro}</p>
        <div className="pres-cards">
          {c.ai.video.map((item) => (
            <div key={item.title} className="panel">
              <h3>{item.title}</h3>
              <p className="muted">{item.text}</p>
              {item.sub && (
                <ul className="pres-list mt8">
                  {item.sub.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="banner info mt24">{c.ai.more}</div>
      </Section>

      <Section title={c.requirements.title}>
        <p className="muted pres-lead">{c.requirements.intro}</p>
        {c.requirements.groups.map((group) => (
          <div key={group.name} className="panel pres-table">
            <h3>{group.name}</h3>
            <div className="table-scroll">
              <table className="t">
                <thead>
                  <tr>
                    <th>{c.requirements.columns.need}</th>
                    <th>{c.requirements.columns.how}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr key={item.need}>
                      <td className="pres-need">{item.need}</td>
                      <td>{item.how}</td>
                      <td className="right">
                        <span className={`chip ${STATUS_CHIP[item.status]}`}>{c.requirements.status[item.status]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </Section>

      <Section title={c.architecture.title}>
        <p className="muted pres-lead">{c.architecture.intro}</p>
        <ol className="pres-layers">
          {c.architecture.layers.map((layer) => (
            <li key={layer.path}>
              <div>
                <b>{layer.name}</b>
                <code>{layer.path}</code>
              </div>
              <p className="muted">{layer.text}</p>
            </li>
          ))}
        </ol>
        <h3 className="pres-subtitle">{c.architecture.domainsTitle}</h3>
        <div className="pres-domains">
          {c.architecture.domains.map((domain) => (
            <div key={domain.name}>
              <code>{domain.name}</code>
              <span className="muted">{domain.text}</span>
            </div>
          ))}
        </div>
        <div className="banner info mt24">{c.architecture.rule}</div>
      </Section>

      <Section title={c.decisions.title}>
        <p className="muted pres-lead">{c.decisions.intro}</p>
        <div className="pres-decisions">
          {c.decisions.items.map((item) => (
            <article key={item.title} className="panel">
              <h3>{item.title}</h3>
              <dl className="kv mt16">
                <dt>{c.decisions.labels.decision}</dt>
                <dd>{item.decision}</dd>
                <dt>{c.decisions.labels.why}</dt>
                <dd>{item.why}</dd>
                <dt>{c.decisions.labels.tradeoff}</dt>
                <dd>{item.tradeoff}</dd>
              </dl>
            </article>
          ))}
        </div>
      </Section>

      <Section title={c.bidding.title}>
        <p className="muted pres-lead">{c.bidding.intro}</p>
        <ol className="pres-steps">
          {c.bidding.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="banner ok mt24">{c.bidding.note}</div>
      </Section>

      <Section title={c.audit.title}>
        <p className="muted pres-lead">{c.audit.intro}</p>
        <pre className="pres-code">
          <code>{"hash = HMAC-SHA256(AUDIT_SECRET, canonical_json({ lotId, seq, type, payload, prevHash, createdAt }))"}</code>
        </pre>
        <ul className="pres-list mt24">
          {c.audit.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <div className="banner warn mt24">{c.audit.limits}</div>
      </Section>

      <Section title={c.security.title}>
        <CardGrid items={c.security.items} />
      </Section>

      <Section title={c.quality.title}>
        <p className="muted pres-lead">{c.quality.intro}</p>
        <CardGrid items={c.quality.items} />
        <h3 className="pres-subtitle">{c.quality.commandsTitle}</h3>
        <div className="panel">
          <dl className="kv pres-commands">
            {c.quality.commands.map((command) => (
              <div key={command.cmd} className="pres-command">
                <dt>
                  <code>{command.cmd}</code>
                </dt>
                <dd>{command.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section title={c.ux.title}>
        <CardGrid items={c.ux.items} />
      </Section>

      <Section title={c.ops.title}>
        <CardGrid items={c.ops.items} />
      </Section>

      <Section title={c.limits.title}>
        <div className="pres-split">
          <ul className="pres-list">
            {c.limits.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="panel beige">
            <h3>{c.limits.nextTitle}</h3>
            <ul className="pres-list mt16">
              {c.limits.next.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="roteiro" title={c.tour.title}>
        <p className="muted pres-lead">{c.tour.intro}</p>
        <ol className="pres-tour">
          {c.tour.steps.map((step, index) => (
            <li key={step.title} className="panel">
              <span className="pres-num">{index + 1}</span>
              <div className="grow">
                <b>{step.title}</b>
                <p className="muted">{step.text}</p>
              </div>
              <Link className="btn btn-outline btn-sm" href={href(step.path)}>
                {step.cta}
              </Link>
            </li>
          ))}
        </ol>
      </Section>

    </div>
  )
}
