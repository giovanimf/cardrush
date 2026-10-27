import { clock } from "@/lib/clock"
import { AppError } from "@/lib/errors"
import { prisma, runTransaction, type Db } from "@/lib/prisma"
import { RULES } from "@/lib/rules"
import { audit } from "@/server/audit"
import { lockLot } from "@/server/lots"
import { lockWallets, settle } from "@/server/payments"
import { notifyLotChangedSafely } from "@/server/realtime"
import { generateReceiptCode, normalizeReceiptCode } from "@/server/settlement/receipt-code"

export type CloseLotResult =
  | { status: "noop"; reason: "NOT_FOUND" | "ALREADY_CLOSED" | "CANCELLED" | "NOT_DUE" | "PAUSED" }
  | { status: "closed"; outcome: "UNSOLD" }
  | { status: "closed"; outcome: "SOLD"; receiptCode: string; finalCents: number }

// Fecha o lote uma única vez (BR-SET-03). Sob o lock do lote, relê: já encerrado, cancelado ou
// fim prorrogado → não faz nada. Débito, crédito, resultado e comprovante na mesma transação.
// respectPause=false só para o próprio seed, que fecha lotes com a liquidação pausada.
export async function closeLot(lotId: string, { respectPause = true }: { respectPause?: boolean } = {}): Promise<CloseLotResult> {
  const result = await runTransaction(async (tx): Promise<CloseLotResult> => {
    // Trava compartilhada da pausa: vários fechamentos convivem, mas nenhum começa (ou segue)
    // enquanto o seed ou o reset seguram a trava exclusiva
    if (respectPause) {
      const [pause] = await tx.$queryRaw<{ free: boolean }[]>`SELECT pg_try_advisory_xact_lock_shared(${SETTLEMENT_PAUSE_KEY}) AS free`
      if (!pause?.free) return { status: "noop", reason: "PAUSED" }
    }

    const lot = await lockLot(tx, lotId)
    const now = clock.now()

    if (!lot) return { status: "noop", reason: "NOT_FOUND" }
    if (lot.closedAt) return { status: "noop", reason: "ALREADY_CLOSED" }
    if (lot.cancelledAt) return { status: "noop", reason: "CANCELLED" }
    // Um lance de última hora pode ter prorrogado o fim depois que a varredura escolheu o lote
    if (now.getTime() < lot.endsAt.getTime()) return { status: "noop", reason: "NOT_DUE" }

    // Sem lances: fecha sem vencedor, sem dinheiro e sem comprovante
    if (lot.bidCount === 0 || !lot.leaderId || lot.currentBidCents === null) {
      const chainHead = await audit.append(tx, { lotId, type: "CLOSED", payload: { outcome: "UNSOLD" }, at: now })
      await tx.lot.update({
        where: { id: lotId },
        data: { closedAt: now, outcome: "UNSOLD", ...(chainHead ? { chainHead } : {}) },
      })
      return { status: "closed", outcome: "UNSOLD" }
    }

    const finalCents = lot.currentBidCents
    await lockWallets(tx, [lot.leaderId, lot.sellerId], now)
    await settle(tx, lot.leaderId, lot.sellerId, finalCents, { lotId, now })

    const chainHead =
      (await audit.append(tx, {
        lotId,
        type: "CLOSED",
        payload: { outcome: "SOLD", winnerId: lot.leaderId, finalCents, bidCount: lot.bidCount },
        at: now,
      })) ?? lot.chainHead

    await tx.lot.update({
      where: { id: lotId },
      data: { closedAt: now, outcome: "SOLD", ...(chainHead ? { chainHead } : {}) },
    })

    // Colisão de código é praticamente impossível (31^12); se acontecer, sorteia de novo.
    // Confere antes de inserir: um erro de unicidade abortaria a transação no Postgres.
    let code = generateReceiptCode()
    while (await tx.receipt.findUnique({ where: { code }, select: { id: true } })) code = generateReceiptCode()

    await tx.receipt.create({
      data: {
        lotId,
        code,
        finalCents,
        bidCount: lot.bidCount,
        winnerId: lot.leaderId,
        chainHead,
        issuedAt: now,
      },
    })

    return { status: "closed", outcome: "SOLD", receiptCode: code, finalCents }
  })

  if (result.status === "closed") await notifyLotChangedSafely(lotId)
  return result
}

// Chave do advisory lock que pausa a liquidação (seed e reset dos testes criam histórico
// já vencido e não podem ter lotes fechados no meio do caminho)
const SETTLEMENT_PAUSE_KEY = 742_001

// Roda fn com a liquidação pausada. O lock é por transação (funciona através do PgBouncer):
// esta transação fica aberta enquanto fn roda os próprios casos de uso em outras conexões.
export async function withSettlementPaused<T>(fn: () => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SETTLEMENT_PAUSE_KEY})`
      return fn()
    },
    { maxWait: 10_000, timeout: 180_000 },
  )
}

async function isSettlementPaused(): Promise<boolean> {
  // Tenta pegar o lock numa transação de um comando só: se conseguir, solta na hora
  const [row] = await prisma.$queryRaw<{ free: boolean }[]>`SELECT pg_try_advisory_xact_lock(${SETTLEMENT_PAUSE_KEY}) AS free`
  return !row?.free
}

// Lote que falhou ao fechar espera um pouco antes da próxima tentativa (1 min, 2 min… até 10),
// para um lote com problema permanente não ocupar sempre o lote da varredura e travar os outros
const retryState = globalThis as unknown as { settlementRetry?: Map<string, { attempts: number; retryAtMs: number }> }
const retries = (retryState.settlementRetry ??= new Map())
const RETRY_BASE_MS = 60_000
const RETRY_MAX_MS = 10 * 60_000

// Fecha os lotes vencidos do mais antigo ao mais novo, cada um na sua transação:
// uma falha em um não trava os outros e é tentada de novo depois (BR-SET-01)
export async function closeDueLots() {
  if (await isSettlementPaused()) {
    return { checked: 0, closed: 0, sold: 0, unsold: 0, failed: 0, paused: true }
  }

  // Espera entre tentativas usa o relógio real (ritmo de reprocessamento, não regra de negócio)
  const realNow = Date.now()
  const waiting = [...retries].filter(([, state]) => state.retryAtMs > realNow).map(([id]) => id)

  const due = await prisma.lot.findMany({
    where: { closedAt: null, cancelledAt: null, endsAt: { lte: clock.now() }, ...(waiting.length > 0 ? { id: { notIn: waiting } } : {}) },
    orderBy: [{ endsAt: "asc" }, { id: "asc" }],
    take: RULES.SETTLEMENT_BATCH_SIZE,
    select: { id: true },
  })

  const summary = { checked: due.length, closed: 0, sold: 0, unsold: 0, failed: 0, paused: false }

  for (const { id } of due) {
    try {
      const result = await closeLot(id)
      retries.delete(id)
      if (result.status === "closed") {
        summary.closed += 1
        if (result.outcome === "SOLD") summary.sold += 1
        else summary.unsold += 1
      }
    } catch (error) {
      summary.failed += 1
      const attempts = (retries.get(id)?.attempts ?? 0) + 1
      retries.set(id, { attempts, retryAtMs: Date.now() + Math.min(RETRY_BASE_MS * attempts, RETRY_MAX_MS) })
      console.error("Falha ao fechar lote", id, `(tentativa ${attempts})`, error)
    }
  }

  return summary
}

// Comprovante público: sem nome, e-mail ou id do vencedor
export async function getReceipt(db: Db, rawCode: string) {
  const code = normalizeReceiptCode(rawCode)
  if (!code) throw new AppError("RECEIPT_NOT_FOUND")

  const receipt = await db.receipt.findUnique({
    where: { code },
    include: {
      lot: {
        select: { id: true, title: true, setName: true, rarity: true, imageUrl: true, sourceUrl: true, seller: { select: { name: true } } },
      },
    },
  })
  if (!receipt) throw new AppError("RECEIPT_NOT_FOUND")

  return {
    code: receipt.code,
    finalCents: receipt.finalCents,
    bidCount: receipt.bidCount,
    chainHead: receipt.chainHead,
    issuedAt: receipt.issuedAt.toISOString(),
    lot: {
      id: receipt.lot.id,
      title: receipt.lot.title,
      setName: receipt.lot.setName,
      rarity: receipt.lot.rarity,
      imageUrl: receipt.lot.imageUrl,
      sourceUrl: receipt.lot.sourceUrl,
      seller: { name: receipt.lot.seller.name },
    },
  }
}

// Meus arremates (bids.view_own)
export async function listWins(db: Db, userId: string) {
  const receipts = await db.receipt.findMany({
    where: { winnerId: userId },
    orderBy: [{ issuedAt: "desc" }],
    include: { lot: { select: { id: true, title: true, setName: true, imageUrl: true } } },
  })

  return receipts.map((receipt) => ({
    code: receipt.code,
    finalCents: receipt.finalCents,
    bidCount: receipt.bidCount,
    issuedAt: receipt.issuedAt.toISOString(),
    lot: receipt.lot,
  }))
}
