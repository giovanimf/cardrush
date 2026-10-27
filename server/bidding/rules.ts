import { RULES } from "@/lib/rules"

// Funções puras do domínio bidding: sem banco, sem relógio global.

type LotPricing = {
  bidCount: number
  startingBidCents: number
  minIncrementCents: number
  currentBidCents: number | null
}

// BR-BID-01: primeiro lance = lance inicial; depois, lance atual + incremento
export function minAcceptableBid(lot: LotPricing): number {
  if (lot.bidCount === 0 || lot.currentBidCents === null) return lot.startingBidCents
  return lot.currentBidCents + lot.minIncrementCents
}

export type Extension = {
  // Quanto o fim avança (0 = não prorroga)
  extendByMs: number
  endsAt: Date
  extendedMs: number
}

// Prorrogação (BR-EXT-01..03): restante = fim − agora; se restante > 2 min (janela inclusiva)
// ou já somou 10 min, nada muda; senão soma min(2 min, 10 min − já somado) ao fim atual.
// Calculada só depois de o lance ser aceito, com o mesmo "agora" das checagens.
export function computeExtension(endsAt: Date, now: Date, extendedMs: number): Extension {
  const remainingMs = endsAt.getTime() - now.getTime()
  const roomMs = RULES.EXTENSION_CAP_MS - extendedMs

  if (remainingMs > RULES.EXTENSION_WINDOW_MS || roomMs <= 0) {
    return { extendByMs: 0, endsAt, extendedMs }
  }

  const extendByMs = Math.min(RULES.EXTENSION_STEP_MS, roomMs)
  return { extendByMs, endsAt: new Date(endsAt.getTime() + extendByMs), extendedMs: extendedMs + extendByMs }
}

// BR-BID-02: valor do lance em centavos, inteiro positivo e dentro do teto
export function isValidBidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= RULES.AMOUNT_MAX_CENTS
}
