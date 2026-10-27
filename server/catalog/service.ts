import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { clock } from "@/lib/clock"
import { AppError, isAppError } from "@/lib/errors"
import type { Db } from "@/lib/prisma"
import { createScryfallClient } from "@/server/catalog/scryfall-client"
import { withTestModes } from "@/server/catalog/simulated"
import type { CatalogAttribute, CatalogItem, CatalogSource } from "@/server/catalog/types"

const RECENT_LIMIT = 24

// Fonte usada pela aplicação: Scryfall, com os modos simulados quando TEST_MODE=1
export function getCatalogSource(): CatalogSource {
  return withTestModes(createScryfallClient())
}

export type CatalogSearchResult = CatalogItem & { inAuction: boolean }

const searchQuerySchema = z.string().trim().min(1).max(200)

type CardRow = Prisma.CatalogCardGetPayload<object>

function rowToItem(row: CardRow): CatalogItem {
  return {
    source: row.source,
    sourceId: row.sourceId,
    title: row.title,
    setName: row.setName,
    rarity: row.rarity,
    releasedAt: row.releasedAt,
    imageUrl: row.imageUrl,
    attributes: row.attributes as CatalogAttribute[],
    sourceUrl: row.sourceUrl,
  }
}

// Guarda as cartas vistas para oferecer com a fonte fora do ar (F3.3).
// Campo vazio na resposta não apaga o que já estava guardado.
async function rememberCards(db: Db, items: CatalogItem[]) {
  const now = clock.now()

  await Promise.all(
    items.map((item) => {
      const data = {
        title: item.title,
        setName: item.setName,
        rarity: item.rarity,
        releasedAt: item.releasedAt,
        imageUrl: item.imageUrl,
        sourceUrl: item.sourceUrl,
      }
      const known = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== null))

      return db.catalogCard.upsert({
        where: { source_sourceId: { source: item.source, sourceId: item.sourceId } },
        create: { ...data, source: item.source, sourceId: item.sourceId, attributes: item.attributes, lastSeenAt: now },
        update: { ...known, attributes: item.attributes, lastSeenAt: now },
      })
    }),
  )
}

// Cartas consultadas antes: primeiro as que batem com a busca; se nenhuma, as mais recentes
export async function recentCards(db: Db, query: string): Promise<CatalogItem[]> {
  const matching = await db.catalogCard.findMany({
    where: { title: { contains: query, mode: "insensitive" } },
    orderBy: { lastSeenAt: "desc" },
    take: RECENT_LIMIT,
  })

  if (matching.length > 0) return matching.map(rowToItem)

  const latest = await db.catalogCard.findMany({ orderBy: { lastSeenAt: "desc" }, take: RECENT_LIMIT })
  return latest.map(rowToItem)
}

// Cartas com lote ativo (não cancelado e não encerrado), para marcar "Em leilão" na busca.
// Lê a tabela Lot direto: importar o domínio lots criaria dependência circular (lots usa catalog).
async function findActiveLotSourceIds(db: Db, items: CatalogItem[]): Promise<Set<string>> {
  if (items.length === 0) return new Set()

  const lots = await db.lot.findMany({
    where: {
      source: { in: [...new Set(items.map((item) => item.source))] },
      sourceItemId: { in: items.map((item) => item.sourceId) },
      cancelledAt: null,
      closedAt: null,
    },
    select: { sourceItemId: true },
  })

  return new Set(lots.map((lot) => lot.sourceItemId))
}

// Uma carta pelo id, para copiar no lote. Com a fonte fora do ar (ou no limite),
// usa a cópia guardada das cartas já consultadas; sem cópia, o erro da fonte sobe.
export async function getCatalogItem(db: Db, source: CatalogSource, sourceId: string): Promise<CatalogItem | null> {
  try {
    const item = await source.getById(sourceId)
    if (item) await rememberCards(db, [item]).catch((error) => console.error("Falha ao guardar carta", error))
    return item
  } catch (error) {
    const isSourceDown = isAppError(error) && (error.code === "SEARCH_UNAVAILABLE" || error.code === "SEARCH_RATE_LIMITED")
    if (!isSourceDown) throw error

    const row = await db.catalogCard.findFirst({ where: { sourceId } })
    if (!row) throw error
    return rowToItem(row)
  }
}

export async function searchCatalog(db: Db, source: CatalogSource, rawQuery: string): Promise<CatalogSearchResult[]> {
  const parsed = searchQuerySchema.safeParse(rawQuery)

  if (!parsed.success) {
    throw new AppError("VALIDATION_FAILED", { fields: { q: ["Informe o que buscar"] } })
  }

  const query = parsed.data
  let items: CatalogItem[]

  try {
    items = await source.search(query)
  } catch (error) {
    // Com a fonte fora, a busca avisa e oferece as cartas já consultadas
    if (isAppError(error) && error.code === "SEARCH_UNAVAILABLE") {
      throw new AppError("SEARCH_UNAVAILABLE", { recent: await recentCards(db, query) })
    }
    throw error
  }

  try {
    await rememberCards(db, items)
  } catch (error) {
    // Falha ao guardar não derruba a busca
    console.error("Falha ao guardar cartas consultadas", error)
  }

  const inAuction = await findActiveLotSourceIds(db, items)
  return items.map((item) => ({ ...item, inAuction: inAuction.has(item.sourceId) }))
}
