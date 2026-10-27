import { clock } from "@/lib/clock"
import { AppError } from "@/lib/errors"
import { prisma, runTransaction, type Db } from "@/lib/prisma"
import { audit, pseudonymFor } from "@/server/audit"
import { lockLot, lotState, toPublicLot } from "@/server/lots"
import { commit, getWallet, lockWallets, release, type WalletView } from "@/server/payments"
import { notifyLotChangedSafely } from "@/server/realtime"
import { computeExtension, minAcceptableBid } from "@/server/bidding/rules"

export type PlaceBidInput = {
  lotId: string
  bidderId: string
  // Já validado como inteiro positivo (isValidBidAmount) antes de chegar aqui
  amountCents: number
  idempotencyKey: string | null
}

type AcceptedBid = { id: string; seq: number; amountCents: number; createdAt: string }

export type PlaceBidResult = {
  bid: AcceptedBid
  // true quando é o reenvio de um lance já aceito com a mesma chave
  replayed: boolean
  extendedByMs: number
}

// Um lance é uma única transação (BR-BID-03). Checagens 1 e 2 (valor e permissão) ficam com
// quem chama, antes da transação. Aqui, sob o lock do lote, nesta ordem:
// 3 reenvio com a mesma chave → 4 cancelado → 5 não iniciado → 6 encerrado → 7 já ganhando
// → 8 abaixo do mínimo → 9 saldo insuficiente. Uma recusa não grava nada e não mexe em saldo.
export async function placeBid(input: PlaceBidInput): Promise<PlaceBidResult> {
  const result = await runTransaction(async (tx): Promise<PlaceBidResult> => {
    const lot = await lockLot(tx, input.lotId)
    // "Agora" lido depois do lock: quem esperou o lock vê o horário real da sua vez
    const now = clock.now()

    if (!lot) throw new AppError("LOT_NOT_FOUND")

    // 3. Reenvio: devolve o lance original, mesmo que o lote já tenha encerrado
    if (input.idempotencyKey) {
      const original = await tx.bid.findUnique({
        where: {
          bidderId_lotId_idempotencyKey: {
            bidderId: input.bidderId,
            lotId: input.lotId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      })
      if (original) {
        return {
          bid: { id: original.id, seq: original.seq, amountCents: original.amountCents, createdAt: original.createdAt.toISOString() },
          replayed: true,
          extendedByMs: 0,
        }
      }
    }

    // 4–6. Estado do lote
    const state = lotState(lot, now)
    if (state === "cancelled") throw new AppError("BID_LOT_CANCELLED")
    if (state === "scheduled") throw new AppError("BID_LOT_NOT_STARTED", { startsAt: lot.startsAt.toISOString() })
    if (state === "closed" || state === "ended") throw new AppError("BID_LOT_ENDED")

    // O dono do lote nunca dá lance nele (mesmo com um papel que tenha bid.place)
    if (lot.sellerId === input.bidderId) throw new AppError("BID_AUCTIONEER_NOT_ALLOWED")

    // 7. Já está ganhando
    if (lot.leaderId === input.bidderId) {
      throw new AppError("BID_ALREADY_LEADING", { currentBidCents: lot.currentBidCents })
    }

    // 8. Abaixo do mínimo
    const minimumCents = minAcceptableBid(lot)
    if (input.amountCents < minimumCents) {
      throw new AppError("BID_BELOW_MINIMUM", { minimumCents, currentBidCents: lot.currentBidCents })
    }

    // Carteiras do novo líder e do anterior, travadas em ordem crescente de userId
    const previousLeaderId = lot.leaderId
    const previousBidCents = lot.currentBidCents
    const wallets = await lockWallets(tx, previousLeaderId ? [input.bidderId, previousLeaderId] : [input.bidderId], now)

    // 9. Não cabe no disponível (o commit confere de novo, como segunda proteção)
    const availableCents = wallets.get(input.bidderId)!.availableCents
    if (availableCents < input.amountCents) {
      throw new AppError("BID_INSUFFICIENT_BALANCE", { availableCents, missingCents: input.amountCents - availableCents })
    }

    const seq = lot.bidCount + 1
    const bid = await tx.bid.create({
      data: {
        lotId: lot.id,
        seq,
        bidderId: input.bidderId,
        amountCents: input.amountCents,
        idempotencyKey: input.idempotencyKey,
        createdAt: now,
      },
    })

    await commit(tx, input.bidderId, input.amountCents, { lotId: lot.id, bidId: bid.id, now })
    if (previousLeaderId && previousBidCents !== null) {
      await release(tx, previousLeaderId, previousBidCents, { lotId: lot.id, bidId: bid.id, now })
    }

    const extension = computeExtension(lot.endsAt, now, lot.extendedMs)

    let chainHead = await audit.append(tx, {
      lotId: lot.id,
      type: "BID",
      payload: { bidId: bid.id, seq, bidderId: input.bidderId, amountCents: input.amountCents },
      at: now,
    })

    if (extension.extendByMs > 0) {
      chainHead =
        (await audit.append(tx, {
          lotId: lot.id,
          type: "EXTENSION",
          payload: {
            fromEndsAt: lot.endsAt.toISOString(),
            toEndsAt: extension.endsAt.toISOString(),
            extendedMs: extension.extendedMs,
          },
          at: now,
        })) ?? chainHead
    }

    await tx.lot.update({
      where: { id: lot.id },
      data: {
        currentBidCents: input.amountCents,
        leaderId: input.bidderId,
        bidCount: seq,
        endsAt: extension.endsAt,
        extendedMs: extension.extendedMs,
        ...(chainHead ? { chainHead } : {}),
      },
    })

    return {
      bid: { id: bid.id, seq, amountCents: bid.amountCents, createdAt: now.toISOString() },
      replayed: false,
      extendedByMs: extension.extendByMs,
    }
  })

  // Depois do commit; uma falha ao avisar nunca desfaz o lance
  if (!result.replayed) await notifyLotChangedSafely(input.lotId)
  return result
}

const RECENT_BIDS = 10

export type ViewerPosition = "leading" | "outbid" | "none"

type LotForRoom = NonNullable<Awaited<ReturnType<typeof findLotForRoom>>>

function findLotForRoom(db: Db, lotId: string) {
  return db.lot.findUnique({
    where: { id: lotId },
    include: {
      seller: { select: { name: true } },
      receipt: { select: { code: true } },
      bids: { orderBy: { seq: "desc" }, take: RECENT_BIDS },
    },
  })
}

// Só o que muda durante o leilão (F9.2). Licitantes aparecem como "you" ou pseudônimo.
async function describeRoom(db: Db, lot: LotForRoom, viewerId: string | null | undefined, now: Date) {
  const state = lotState(lot, now)
  const viewerHasBid =
    !!viewerId && (lot.bids.some((bid) => bid.bidderId === viewerId) ||
      (await db.bid.count({ where: { lotId: lot.id, bidderId: viewerId } })) > 0)

  const position: ViewerPosition = !viewerId
    ? "none"
    : lot.leaderId === viewerId
      ? "leading"
      : viewerHasBid
        ? "outbid"
        : "none"

  return {
    lotId: lot.id,
    state,
    outcome: lot.outcome,
    currentBidCents: lot.currentBidCents,
    minimumBidCents: state === "live" || state === "scheduled" ? minAcceptableBid(lot) : null,
    bidCount: lot.bidCount,
    startsAt: lot.startsAt.toISOString(),
    endsAt: lot.endsAt.toISOString(),
    originalEndsAt: lot.originalEndsAt.toISOString(),
    extendedMs: lot.extendedMs,
    receiptCode: lot.receipt?.code ?? null,
    recentBids: lot.bids.map((bid) => ({
      seq: bid.seq,
      amountCents: bid.amountCents,
      createdAt: bid.createdAt.toISOString(),
      bidder: bid.bidderId === viewerId ? "you" : pseudonymFor(lot.id, bid.bidderId),
    })),
    viewer: viewerId ? { position, isSeller: lot.sellerId === viewerId } : null,
    // O navegador calcula a diferença entre relógios a partir daqui (F9.5)
    serverNow: now.toISOString(),
  }
}

// Rota leve do polling: só o estado que muda, sem os dados da carta
export async function getRoomUpdate(db: Db, lotId: string, viewerId?: string | null) {
  const lot = await findLotForRoom(db, lotId)
  if (!lot) throw new AppError("LOT_NOT_FOUND")
  return describeRoom(db, lot, viewerId, clock.now())
}

// Sala completa (primeira carga): lote público + estado da sala
export async function getRoomState(db: Db, lotId: string, viewerId?: string | null) {
  const lot = await findLotForRoom(db, lotId)
  if (!lot) throw new AppError("LOT_NOT_FOUND")

  const now = clock.now()
  return { lot: toPublicLot(lot, now), room: await describeRoom(db, lot, viewerId, now) }
}

export type RoomUpdate = Awaited<ReturnType<typeof getRoomUpdate>>
export type RoomState = Awaited<ReturnType<typeof getRoomState>>

// Resposta do lance: resultado + sala + carteira atualizadas
export async function placeBidAndDescribe(input: PlaceBidInput): Promise<{
  result: PlaceBidResult
  room: RoomUpdate
  wallet: WalletView
}> {
  const result = await placeBid(input)
  const [room, wallet] = await Promise.all([
    getRoomUpdate(prisma, input.lotId, input.bidderId),
    getWallet(prisma, input.bidderId),
  ])
  return { result, room, wallet }
}

export type ParticipationStatus = "winning" | "outbid" | "won" | "lost" | "cancelled" | "closing"

// Meus arremates: todos os lotes em que dei lance, com a minha posição e o resultado
export async function listParticipation(db: Db, userId: string) {
  const groups = await db.bid.groupBy({ by: ["lotId"], where: { bidderId: userId }, _max: { amountCents: true } })
  if (groups.length === 0) return { items: [], serverNow: clock.now().toISOString() }

  const now = clock.now()
  const myMax = new Map(groups.map((group) => [group.lotId, group._max.amountCents ?? 0]))
  const lots = await db.lot.findMany({
    where: { id: { in: [...myMax.keys()] } },
    include: { receipt: { select: { code: true, finalCents: true, issuedAt: true } } },
    orderBy: { endsAt: "desc" },
  })

  const items = lots.map((lot) => {
    const state = lotState(lot, now)
    const leading = lot.leaderId === userId
    const status: ParticipationStatus =
      state === "cancelled" ? "cancelled"
        : state === "closed" ? (leading ? "won" : "lost")
          : state === "ended" ? "closing"
            : leading ? "winning" : "outbid"

    return {
      lotId: lot.id,
      title: lot.title,
      setName: lot.setName,
      releasedAt: lot.releasedAt,
      imageUrl: lot.imageUrl,
      state,
      status,
      endsAt: lot.endsAt.toISOString(),
      currentBidCents: lot.currentBidCents,
      myMaxCents: myMax.get(lot.id) ?? 0,
      receipt: leading && lot.receipt
        ? { code: lot.receipt.code, finalCents: lot.receipt.finalCents, issuedAt: lot.receipt.issuedAt.toISOString() }
        : null,
    }
  })

  return { items, serverNow: now.toISOString() }
}
