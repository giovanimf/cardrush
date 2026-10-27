import { Prisma, type Lot } from "@prisma/client"
import { clock } from "@/lib/clock"
import { AppError } from "@/lib/errors"
import { prisma, runTransaction, table, type Db, type Tx } from "@/lib/prisma"
import { RULES } from "@/lib/rules"
import { audit, pseudonymFor } from "@/server/audit"
import { getCatalogItem, type CatalogAttribute, type CatalogSource } from "@/server/catalog"
import { notifyLotChangedSafely } from "@/server/realtime"
import { lotState, validateLotInput, type LotState } from "@/server/lots/rules"

// Trava a linha do lote (SELECT ... FOR UPDATE) e relê já travado.
// Ordem de locks em todo o sistema: lote primeiro, depois carteiras por userId crescente.
export async function lockLot(tx: Tx, lotId: string): Promise<Lot | null> {
  const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM ${table("Lot")} WHERE "id" = ${lotId} FOR UPDATE`
  if (locked.length === 0) return null
  return tx.lot.findUnique({ where: { id: lotId } })
}

type LotWithSeller = Lot & { seller: { name: string } }

// Visão pública do lote: sem id, nome ou e-mail do licitante
export function toPublicLot(lot: LotWithSeller, now: Date) {
  return {
    id: lot.id,
    state: lotState(lot, now) as LotState,
    outcome: lot.outcome,
    title: lot.title,
    setName: lot.setName,
    rarity: lot.rarity,
    releasedAt: lot.releasedAt,
    imageUrl: lot.imageUrl,
    attributes: lot.attributes as CatalogAttribute[],
    source: lot.source,
    sourceItemId: lot.sourceItemId,
    sourceUrl: lot.sourceUrl,
    seller: { name: lot.seller.name },
    startingBidCents: lot.startingBidCents,
    minIncrementCents: lot.minIncrementCents,
    currentBidCents: lot.currentBidCents,
    bidCount: lot.bidCount,
    startsAt: lot.startsAt.toISOString(),
    endsAt: lot.endsAt.toISOString(),
    originalEndsAt: lot.originalEndsAt.toISOString(),
    extendedMs: lot.extendedMs,
    chainHead: lot.chainHead,
    cancelledAt: lot.cancelledAt?.toISOString() ?? null,
    closedAt: lot.closedAt?.toISOString() ?? null,
    // Vencedor só por pseudônimo (nunca id, nome ou e-mail)
    winnerPseudonym: lot.outcome === "SOLD" && lot.leaderId ? pseudonymFor(lot.id, lot.leaderId) : null,
  }
}

export type PublicLot = ReturnType<typeof toPublicLot>

// Cria e publica o lote (agora ou agendado). Sem rascunho e sem edição depois.
export async function createLot(db: Db, source: CatalogSource, sellerId: string, raw: Record<string, unknown>) {
  const now = clock.now()
  const validation = validateLotInput(raw, now)

  if (!validation.ok) {
    throw new AppError("VALIDATION_FAILED", { fields: validation.fields })
  }

  const input = validation.value
  const item = await getCatalogItem(db, source, input.sourceItemId)

  if (!item) {
    throw new AppError("ITEM_UNAVAILABLE", { sourceItemId: input.sourceItemId })
  }

  try {
    const lot = await db.lot.create({
      data: {
        sellerId,
        source: item.source,
        sourceItemId: item.sourceId,
        title: item.title,
        setName: item.setName,
        rarity: item.rarity,
        releasedAt: item.releasedAt,
        imageUrl: item.imageUrl,
        attributes: item.attributes,
        sourceUrl: item.sourceUrl,
        startingBidCents: input.startingBidCents,
        minIncrementCents: input.minIncrementCents,
        startsAt: input.startsAt ?? now,
        endsAt: input.endsAt,
        originalEndsAt: input.endsAt,
        createdAt: now,
      },
      include: { seller: { select: { name: true } } },
    })

    await notifyLotChangedSafely(lot.id)
    return toPublicLot(lot, now)
  } catch (error) {
    // O único índice único do Lot é o parcial: carta já em lote ativo (F4.2)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("LOT_ITEM_ALREADY_AUCTIONED", { sourceItemId: item.sourceId })
    }
    throw error
  }
}

// Cancela o lote: só o dono, só sem lances, não encerrado. Idempotente.
// Cancelamento contra primeiro lance: quem pegar o lock do lote primeiro vence.
export async function cancelLot(sellerId: string, lotId: string) {
  const result = await runTransaction(async (tx) => {
    const lot = await lockLot(tx, lotId)
    const now = clock.now()

    if (!lot) throw new AppError("LOT_NOT_FOUND")
    if (lot.sellerId !== sellerId) throw new AppError("LOT_NOT_OWNED")
    if (lot.cancelledAt) return { lotId, changed: false }

    const state = lotState(lot, now)
    if (state === "closed" || state === "ended") throw new AppError("LOT_CANCEL_ENDED")
    if (lot.bidCount > 0) throw new AppError("LOT_CANCEL_HAS_BIDS", { bidCount: lot.bidCount })

    await tx.lot.update({ where: { id: lotId }, data: { cancelledAt: now } })
    const chainHead = await audit.append(tx, { lotId, type: "CANCELLED", payload: { sellerId }, at: now })
    if (chainHead) await tx.lot.update({ where: { id: lotId }, data: { chainHead } })

    return { lotId, changed: true }
  })

  if (result.changed) await notifyLotChangedSafely(lotId)
  return getLot(prisma, lotId)
}

export async function getLot(db: Db, lotId: string): Promise<PublicLot> {
  const lot = await db.lot.findUnique({ where: { id: lotId }, include: { seller: { select: { name: true } } } })
  if (!lot) throw new AppError("LOT_NOT_FOUND")
  return toPublicLot(lot, clock.now())
}

export const SHOWCASE_TABS = ["live", "scheduled", "ended"] as const
export type ShowcaseTab = (typeof SHOWCASE_TABS)[number]

// Busca da vitrine: até 80 caracteres, comparada com o nome da carta e a coleção
export const SHOWCASE_QUERY_MAX = 80

// Vitrine por aba, 12 por página. Cancelados nunca aparecem.
export async function listShowcase(db: Db, tab: ShowcaseTab, page: number, query = "") {
  const now = clock.now()

  const byTab: Record<ShowcaseTab, { where: Prisma.LotWhereInput; orderBy: Prisma.LotOrderByWithRelationInput[] }> = {
    // Ao vivo: fim mais próximo primeiro
    live: {
      where: { cancelledAt: null, closedAt: null, startsAt: { lte: now }, endsAt: { gt: now } },
      orderBy: [{ endsAt: "asc" }, { id: "asc" }],
    },
    // Agendados: início mais próximo primeiro
    scheduled: {
      where: { cancelledAt: null, closedAt: null, startsAt: { gt: now } },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    },
    // Encerrados (liquidados ou aguardando a varredura): mais recentes primeiro
    ended: {
      where: { cancelledAt: null, OR: [{ closedAt: { not: null } }, { endsAt: { lte: now } }] },
      orderBy: [{ endsAt: "desc" }, { id: "asc" }],
    },
  }

  const needle = query.trim().slice(0, SHOWCASE_QUERY_MAX)
  const where: Prisma.LotWhereInput = needle
    ? {
        AND: [
          byTab[tab].where,
          { OR: [{ title: { contains: needle, mode: "insensitive" } }, { setName: { contains: needle, mode: "insensitive" } }] },
        ],
      }
    : byTab[tab].where
  const { orderBy } = byTab[tab]
  const pageSize = RULES.SHOWCASE_PAGE_SIZE

  const [total, lots] = await Promise.all([
    db.lot.count({ where }),
    db.lot.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { seller: { select: { name: true } } },
    }),
  ])

  return {
    tab,
    query: needle,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items: lots.map((lot) => toPublicLot(lot, now)),
    // O navegador calcula a diferença entre relógios a partir daqui
    serverNow: now.toISOString(),
  }
}

// Painel do leiloeiro: meus lotes com resultado (o total recebido vem do domínio payments)
export async function listSellerLots(db: Db, sellerId: string) {
  const now = clock.now()
  const lots = await db.lot.findMany({
    where: { sellerId },
    orderBy: [{ createdAt: "desc" }],
    include: { seller: { select: { name: true } }, receipt: { select: { code: true, finalCents: true } } },
  })

  return lots.map((lot) => ({
    ...toPublicLot(lot, now),
    receipt: lot.receipt ? { code: lot.receipt.code, finalCents: lot.receipt.finalCents } : null,
  }))
}
