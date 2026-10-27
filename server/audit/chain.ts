import { createHmac, timingSafeEqual } from "node:crypto"

// Funções puras da cadeia de auditoria: sem banco. A chave vem por parâmetro.

export const GENESIS = "GENESIS"

export type ChainEntry = {
  lotId: string
  seq: number
  type: string
  payload: unknown
  prevHash: string
  hash: string
  createdAt: Date
}

// JSON canônico: chaves ordenadas, sem espaços. Deixa o hash independente da ordem
// das chaves no jsonb (o Postgres reordena ao gravar).
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (value instanceof Date) return JSON.stringify(value.toISOString())
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`
}

// hash = HMAC-SHA256(segredo, canonical({ lotId, seq, type, payload, prevHash, createdAt }))
export function computeHash(secret: string, entry: Omit<ChainEntry, "hash">): string {
  const material = canonicalJson({
    lotId: entry.lotId,
    seq: entry.seq,
    type: entry.type,
    payload: entry.payload,
    prevHash: entry.prevHash,
    createdAt: entry.createdAt.toISOString(),
  })
  return createHmac("sha256", secret).update(material).digest("hex")
}

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export type ChainProblem = "SEQ_GAP" | "LINK_BROKEN" | "HASH_MISMATCH"

export type ChainCheck =
  | { status: "INTACT" }
  | { status: "TAMPERED"; firstBrokenSeq: number; problem: ChainProblem }

// Confere a cadeia na ordem de seq: sequência sem buraco começando em 1, cada prevHash igual
// ao hash anterior e cada hash recalculado igual ao gravado
export function checkChain(secret: string, entries: ChainEntry[]): ChainCheck {
  let expectedPrev = GENESIS

  for (const [index, entry] of entries.entries()) {
    const expectedSeq = index + 1

    if (entry.seq !== expectedSeq) {
      return { status: "TAMPERED", firstBrokenSeq: Math.min(entry.seq, expectedSeq), problem: "SEQ_GAP" }
    }
    if (!sameHash(entry.prevHash, expectedPrev)) {
      return { status: "TAMPERED", firstBrokenSeq: entry.seq, problem: "LINK_BROKEN" }
    }
    if (!sameHash(computeHash(secret, entry), entry.hash)) {
      return { status: "TAMPERED", firstBrokenSeq: entry.seq, problem: "HASH_MISMATCH" }
    }

    expectedPrev = entry.hash
  }

  return { status: "INTACT" }
}
