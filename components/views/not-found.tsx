"use client"

import Link from "next/link"
import { useI18n } from "@/components/providers"
import { EmptyState } from "@/components/ui"

export function NotFoundView() {
  const { t, href } = useI18n()

  return (
    <div className="wrap" style={{ padding: "64px 0" }}>
      <EmptyState
        title={t.notFound.title}
        text={t.notFound.text}
        action={
          <Link className="btn btn-dark" href={href("/lots")}>
            {t.notFound.cta}
          </Link>
        }
      />
    </div>
  )
}
