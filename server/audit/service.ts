import { Prisma } from "@prisma/client"
import { clock } from "@/lib/clock"
import { env } from "@/lib/env"
import { AppError } from "@/lib/errors"
import { prisma, type Tx } from "@/lib/prisma"
import { checkChain, computeHash, GENESIS, type ChainProblem } from "@/server/audit/chain"
import { pseudonymFor } from "@/server/audit/pseudonym"

// Os quatro fatos que entram na cadeia
export type AuditFactType = "BID" | "EXTENSION" | "CANCELLED" | "CLOSED"

export type AuditFact = {
  lotId: string
  type: AuditFactType
  payload: Record<string, unknown>
  at: Date
}

// Grava o fato na cadeia do lote. Chamar dentro da transação que produziu o fato e com o lote
// já travado (FOR UPDATE): é o lock que garante seq sem buraco. Atualiza Lot.chainHead.
export async function append(tx: Tx, fact: AuditFact): Promise<string> {
  const last = await tx.auditEntry.findFirst({
    where: { lotId: fact.lotId },
    orderBy: { seq: "desc" },
    select: { seq: true, hash: true },
  })

  const entry = {
    lotId: fact.lotId,
    seq: (last?.seq ?? 0) + 1,
    type: fact.type,
    payload: fact.payload,
    prevHash: last?.hash ?? GENESIS,
    createdAt: fact.at,
  }
  const hash = computeHash(env.AUDIT_SECRET, entry)

  await tx.auditEntry.create({ data: { ...entry, payload: fact.payload as Prisma.InputJsonObject, hash } })
  await tx.lot.update({ where: { id: fact.lotId }, data: { chainHead: hash } })

  return hash
}

export type AuditProblem =
  | ChainProblem
  | "HEAD_MISMATCH"
  | "RECEIPT_MISMATCH"
  | "BID_COUNT_MISMATCH"
  | "BID_ROW_MISMATCH"
  | "LOT_STATE_MISMATCH"

type Payload = Record<string, unknown>

// Dados públicos de cada fato: licitantes só por pseudônimo
function publicData(lotId: string, type: string, payload: Payload) {
  const pseudonym = (userId: unknown) => (typeof userId === "string" ? pseudonymFor(lotId, userId) : null)

  switch (type) {
    case "BID":
      return { bidSeq: payload.seq, amountCents: payload.amountCents, bidder: pseudonym(payload.bidderId) }
    case "EXTENSION":
      return { fromEndsAt: payload.fromEndsAt, toEndsAt: payload.toEndsAt, extendedMs: payload.extendedMs }
    case "CLOSED":
      return {
        outcome: payload.outcome,
        finalCents: payload.finalCents ?? null,
        bidCount: payload.bidCount ?? 0,
        winner: pseudonym(payload.winnerId),
      }
    default:
      return {}
  }
}

// Verificação pública (BR-AUD-01). Lê lote, cadeia, lances e comprovante no mesmo snapshot
// (RepeatableRead), para um lance chegando durante a leitura não parecer adulteração.
// Recalcula a cada acesso; o selo nunca é guardado.
export async function verifyLot(lotId: string) {
  const snapshot = await prisma.$transaction(
    async (tx) => {
      const lot = await tx.lot.findUnique({ where: { id: lotId } })
      if (!lot) return null

      const [entries, bids, receipt] = await Promise.all([
        tx.auditEntry.findMany({ where: { lotId }, orderBy: { seq: "asc" } }),
        tx.bid.findMany({ where: { lotId }, orderBy: { seq: "asc" } }),
        tx.receipt.findUnique({ where: { lotId } }),
      ])
      return { lot, entries, bids, receipt }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  )

  if (!snapshot) throw new AppError("LOT_NOT_FOUND")
  const { lot, entries, bids, receipt } = snapshot

  const problems: { seq: number | null; problem: AuditProblem }[] = []

  // 1. A cadeia em si
  const chain = checkChain(env.AUDIT_SECRET, entries)
  if (chain.status === "TAMPERED") problems.push({ seq: chain.firstBrokenSeq, problem: chain.problem })

  // 2. Âncoras: último hash = Lot.chainHead (corta o fim da cadeia)
  const lastHash = entries.at(-1)?.hash ?? null
  if (lastHash !== lot.chainHead) problems.push({ seq: entries.at(-1)?.seq ?? 1, problem: "HEAD_MISMATCH" })

  // 3. Âncora do comprovante: o hash do fechamento e os valores que ele declara
  //    (resultado, valor final, vencedor e número de lances) batem com o fato CLOSED
  const closed = entries.find((entry) => entry.type === "CLOSED")
  if (receipt) {
    const closedPayload = (closed?.payload ?? {}) as Payload
    const matches =
      closed &&
      closed.hash === receipt.chainHead &&
      closedPayload.finalCents === receipt.finalCents &&
      closedPayload.winnerId === receipt.winnerId &&
      closedPayload.bidCount === receipt.bidCount
    if (!matches) problems.push({ seq: closed?.seq ?? entries.at(-1)?.seq ?? 1, problem: "RECEIPT_MISMATCH" })
  }
  if (closed && (closed.payload as Payload).outcome !== lot.outcome) {
    problems.push({ seq: closed.seq, problem: "LOT_STATE_MISMATCH" })
  }

  // 4. Contagem de lances: lote, cadeia e tabela de lances
  const bidEntries = entries.filter((entry) => entry.type === "BID")
  if (bidEntries.length !== lot.bidCount || bids.length !== lot.bidCount) {
    problems.push({ seq: bidEntries.at(-1)?.seq ?? null, problem: "BID_COUNT_MISMATCH" })
  }

  // 5. Cada BID da cadeia bate com a linha da tabela de lances (valor, autor, horário)
  const bidsBySeq = new Map(bids.map((bid) => [bid.seq, bid]))
  for (const entry of bidEntries) {
    const payload = entry.payload as Payload
    const row = bidsBySeq.get(payload.seq as number)
    const matches =
      row &&
      row.id === payload.bidId &&
      row.bidderId === payload.bidderId &&
      row.amountCents === payload.amountCents &&
      row.createdAt.getTime() === entry.createdAt.getTime()
    if (!matches) problems.push({ seq: entry.seq, problem: "BID_ROW_MISMATCH" })
  }

  // 6. O estado do lote que move dinheiro (líder, lance atual, fim vigente) é o que a cadeia diz:
  //    líder e valor do último BID; fim do último EXTENSION (ou o fim original, sem prorrogação)
  const lastBid = bidEntries.at(-1)
  const lastBidPayload = (lastBid?.payload ?? {}) as Payload
  const leaderMatches = lastBid
    ? lot.leaderId === lastBidPayload.bidderId && lot.currentBidCents === lastBidPayload.amountCents
    : lot.leaderId === null && lot.currentBidCents === null
  if (!leaderMatches) problems.push({ seq: lastBid?.seq ?? null, problem: "LOT_STATE_MISMATCH" })

  const lastExtension = entries.filter((entry) => entry.type === "EXTENSION").at(-1)
  const extensionPayload = (lastExtension?.payload ?? {}) as Payload
  const endMatches = lastExtension
    ? lot.endsAt.toISOString() === extensionPayload.toEndsAt && lot.extendedMs === extensionPayload.extendedMs
    : lot.endsAt.getTime() === lot.originalEndsAt.getTime() && lot.extendedMs === 0
  if (!endMatches) problems.push({ seq: lastExtension?.seq ?? null, problem: "LOT_STATE_MISMATCH" })

  const brokenSeqs = problems.map((item) => item.seq).filter((seq): seq is number => seq !== null)
  const tampered = problems.length > 0

  return {
    lotId,
    status: tampered ? ("TAMPERED" as const) : ("INTACT" as const),
    firstBrokenSeq: tampered ? (brokenSeqs.length > 0 ? Math.min(...brokenSeqs) : null) : null,
    problems: [...new Set(problems.map((item) => item.problem))],
    chainHead: lot.chainHead,
    receiptChainHead: receipt?.chainHead ?? null,
    bidCount: lot.bidCount,
    checkedAt: clock.now().toISOString(),
    entries: entries.map((entry) => ({
      seq: entry.seq,
      type: entry.type,
      createdAt: entry.createdAt.toISOString(),
      prevHash: entry.prevHash,
      hash: entry.hash,
      data: publicData(lotId, entry.type, entry.payload as Payload),
    })),
  }
}
