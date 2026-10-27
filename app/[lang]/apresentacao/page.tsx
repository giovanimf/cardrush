import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { isLocale } from "@/lib/i18n"
import { PresentationView } from "@/components/views/presentation"
import { PRESENTATION } from "@/components/views/presentation-content"

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  const { meta } = PRESENTATION[isLocale(lang) ? lang : "pt"]
  return { title: meta.title, description: meta.description }
}

export default async function PresentationPage({ params }: Props) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return <PresentationView lang={lang} />
}
