import type { CatalogAttribute, CatalogItem } from "@/server/catalog/types"

export const SCRYFALL_SOURCE = "scryfall"

// Campos da Scryfall que usamos (a resposta tem muitos outros)
type ScryfallImageUris = { normal?: string; large?: string; small?: string }

type ScryfallFace = {
  name?: string
  mana_cost?: string
  type_line?: string
  image_uris?: ScryfallImageUris
}

export type ScryfallCard = {
  id: string
  name?: string
  set_name?: string
  rarity?: string
  released_at?: string
  image_uris?: ScryfallImageUris
  card_faces?: ScryfallFace[]
  mana_cost?: string
  type_line?: string
  artist?: string
  collector_number?: string
  set?: string
  scryfall_uri?: string
}

function text(value: string | undefined | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

// Só guarda URLs https da própria Scryfall (scryfall.com e scryfall.io); o resto vira null
function scryfallUrl(value: string | undefined | null): string | null {
  const raw = text(value)
  if (!raw) return null
  try {
    const url = new URL(raw)
    const trusted = url.hostname === "scryfall.com" || url.hostname.endsWith(".scryfall.com") || url.hostname === "scryfall.io" || url.hostname.endsWith(".scryfall.io")
    return url.protocol === "https:" && trusted ? url.toString() : null
  } catch {
    return null
  }
}

// Converte uma carta da Scryfall para o nosso CatalogItem (função pura)
export function normalizeScryfallCard(card: ScryfallCard): CatalogItem {
  const firstFace = card.card_faces?.[0]
  const images = card.image_uris ?? firstFace?.image_uris

  const attributes: CatalogAttribute[] = []
  const addAttribute = (key: string, value: string | undefined) => {
    const cleaned = text(value)
    if (cleaned) attributes.push({ key, value: cleaned })
  }

  addAttribute("type", card.type_line ?? firstFace?.type_line)
  addAttribute("manaCost", card.mana_cost ?? firstFace?.mana_cost)
  addAttribute("set", card.set?.toUpperCase())
  addAttribute("collectorNumber", card.collector_number)
  addAttribute("artist", card.artist)

  return {
    source: SCRYFALL_SOURCE,
    sourceId: card.id,
    title: text(card.name ?? firstFace?.name),
    setName: text(card.set_name),
    rarity: text(card.rarity),
    releasedAt: text(card.released_at),
    imageUrl: scryfallUrl(images?.normal ?? images?.large ?? images?.small),
    attributes,
    sourceUrl: scryfallUrl(card.scryfall_uri),
  }
}
