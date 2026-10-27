import { Prisma } from "@prisma/client"
import { clock } from "@/lib/clock"
import { AppError } from "@/lib/errors"
import { parseMoneyToCents } from "@/lib/money"
import { runTransaction, table, type Db, type Tx } from "@/lib/prisma"
import { RULES } from "@/lib/rules"

const ENTRIES_PAGE_SIZE = 20
// Maior valor de uma coluna int4 do Postgres
const INT4_MAX = 2_147_483_647

export type WalletView = {
  totalCents: number
  committedCents: number
  // Sempre calculado, nunca gravado
  availableCents: number
}

type WalletRow = { userId: string; totalCents: number; committedCents: number }

function toView(row: Pick<WalletRow, "totalCents" | "committedCents"> | null): WalletView {
  const totalCents = row?.totalCents ?? 0
  const committedCents = row?.committedCents ?? 0
  return { totalCents, committedCents, availableCents: totalCents - committedCents }
}

// Garante a carteira e trava as linhas em ordem crescente de userId (mesma ordem em lance,
// cancelamento e liquidação, o que evita deadlock). Chamar sempre depois do lock do lote.
export async function lockWallets(tx: Tx, userIds: string[], now: Date): Promise<Map<string, WalletView>> {
  const ids = [...new Set(userIds)].sort()

  await tx.$executeRaw`
    INSERT INTO ${table("Wallet")} ("userId", "totalCents", "committedCents", "updatedAt")
    SELECT id, 0, 0, ${now} FROM unnest(${ids}::text[]) AS id
    ON CONFLICT ("userId") DO NOTHING`

  const rows = await tx.$queryRaw<WalletRow[]>`
    SELECT "userId", "totalCents", "committedCents" FROM ${table("Wallet")}
    WHERE "userId" = ANY(${ids}::text[])
    ORDER BY "userId"
    FOR UPDATE`

  return new Map(rows.map((row) => [row.userId, toView(row)]))
}

export async function getWallet(db: Db, userId: string): Promise<WalletView> {
  return toView(await db.wallet.findUnique({ where: { userId } }))
}

type DepositResult = { wallet: WalletView; entryId: string; replayed: boolean }

// Texto vai pelo parser de dinheiro. Número JSON precisa ter no máximo 2 casas:
// String(12.345) viraria "12.345", que o parser leria como milhar (R$ 12.345,00).
function toDepositCents(amount: unknown): number | null {
  if (typeof amount === "string") return parseMoneyToCents(amount)
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null
  const cents = Math.round(amount * 100)
  return Math.abs(cents - amount * 100) < 1e-6 && Number.isSafeInteger(cents) ? cents : null
}

// Depósito simulado: só o valor (> 0, até 2 casas, até o teto). A chave de idempotência
// evita crédito duplo num clique duplo: o reenvio devolve o depósito original.
export async function deposit(userId: string, amount: unknown, idempotencyKey: string | null): Promise<DepositResult> {
  const amountCents = toDepositCents(amount)

  if (amountCents === null) throw new AppError("DEPOSIT_INVALID_AMOUNT", { reason: "INVALID" })
  if (amountCents <= 0) throw new AppError("DEPOSIT_INVALID_AMOUNT", { reason: "NOT_POSITIVE" })
  if (amountCents > RULES.DEPOSIT_MAX_CENTS) {
    throw new AppError("DEPOSIT_INVALID_AMOUNT", { reason: "ABOVE_MAX", maxCents: RULES.DEPOSIT_MAX_CENTS })
  }

  return runTransaction(async (tx) => {
    const now = clock.now()
    const wallets = await lockWallets(tx, [userId], now)

    // Com a carteira travada, dois reenvios da mesma chave não passam juntos
    if (idempotencyKey) {
      const existing = await tx.walletEntry.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
      })
      if (existing) return { wallet: wallets.get(userId)!, entryId: existing.id, replayed: true }
    }

    const current = wallets.get(userId)!
    if (current.totalCents + amountCents > RULES.WALLET_MAX_TOTAL_CENTS) {
      throw new AppError("DEPOSIT_INVALID_AMOUNT", { reason: "WALLET_LIMIT", maxTotalCents: RULES.WALLET_MAX_TOTAL_CENTS })
    }

    const updated = await tx.wallet.update({
      where: { userId },
      data: { totalCents: { increment: amountCents } },
    })
    const entry = await tx.walletEntry.create({
      data: { userId, type: "DEPOSIT", amountCents, idempotencyKey, createdAt: now },
    })

    return { wallet: toView(updated), entryId: entry.id, replayed: false }
  })
}

type MovementRef = { lotId: string; bidId?: string; now: Date }

// Compromete saldo ao assumir a liderança. A carteira precisa estar travada (lockWallets).
export async function commit(tx: Tx, userId: string, amountCents: number, ref: MovementRef) {
  const wallet = toView(await tx.wallet.findUnique({ where: { userId } }))

  if (wallet.availableCents < amountCents) {
    throw new AppError("BID_INSUFFICIENT_BALANCE", {
      availableCents: wallet.availableCents,
      missingCents: amountCents - wallet.availableCents,
    })
  }

  await tx.wallet.update({ where: { userId }, data: { committedCents: { increment: amountCents } } })
  await tx.walletEntry.create({
    data: { userId, type: "COMMIT", amountCents, lotId: ref.lotId, bidId: ref.bidId, createdAt: ref.now },
  })
}

// Libera o saldo do líder anterior, na mesma transação do novo lance
export async function release(tx: Tx, userId: string, amountCents: number, ref: MovementRef) {
  await tx.wallet.update({ where: { userId }, data: { committedCents: { decrement: amountCents } } })
  await tx.walletEntry.create({
    data: { userId, type: "RELEASE", amountCents, lotId: ref.lotId, bidId: ref.bidId, createdAt: ref.now },
  })
}

// Liquidação: vencedor perde total e comprometido; leiloeiro recebe 100%, sem comissão.
// Nunca falha por saldo: o valor está comprometido desde o lance.
export async function settle(tx: Tx, winnerId: string, sellerId: string, amountCents: number, ref: MovementRef) {
  await tx.wallet.update({
    where: { userId: winnerId },
    data: { totalCents: { decrement: amountCents }, committedCents: { decrement: amountCents } },
  })
  // As colunas são int4: recusa antes de estourar (a liquidação fica para nova tentativa e
  // não trava os outros lotes; ver closeDueLots)
  const seller = await tx.wallet.findUnique({ where: { userId: sellerId }, select: { totalCents: true } })
  if ((seller?.totalCents ?? 0) + amountCents > INT4_MAX) {
    throw new Error(`Crédito do lote ${ref.lotId} passaria do limite da carteira do vendedor`)
  }
  await tx.wallet.update({ where: { userId: sellerId }, data: { totalCents: { increment: amountCents } } })
  await tx.walletEntry.createMany({
    data: [
      { userId: winnerId, type: "SETTLEMENT_DEBIT", amountCents, lotId: ref.lotId, createdAt: ref.now },
      { userId: sellerId, type: "SETTLEMENT_CREDIT", amountCents, lotId: ref.lotId, createdAt: ref.now },
    ],
  })
}

// Extrato, mais recente primeiro
export async function entries(db: Db, userId: string, page: number) {
  const where: Prisma.WalletEntryWhereInput = { userId }
  const [total, items] = await Promise.all([
    db.walletEntry.count({ where }),
    db.walletEntry.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * ENTRIES_PAGE_SIZE,
      take: ENTRIES_PAGE_SIZE,
      select: { id: true, type: true, amountCents: true, lotId: true, createdAt: true },
    }),
  ])

  return {
    page,
    pageSize: ENTRIES_PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / ENTRIES_PAGE_SIZE)),
    items: items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
  }
}

// Total recebido pelo leiloeiro (painel)
export async function totalReceivedCents(db: Db, userId: string): Promise<number> {
  const result = await db.walletEntry.aggregate({
    where: { userId, type: "SETTLEMENT_CREDIT" },
    _sum: { amountCents: true },
  })
  return result._sum.amountCents ?? 0
}
