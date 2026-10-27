import { RULES } from "@/lib/rules"

// Funções puras do domínio lots: sem banco, sem relógio global (o "agora" vem por parâmetro).

export type LotState = "cancelled" | "closed" | "scheduled" | "live" | "ended"

type LotTiming = {
  startsAt: Date
  endsAt: Date
  cancelledAt: Date | null
  closedAt: Date | null
}

// Estado derivado (BR-LOT-04), nesta ordem: cancelado → encerrado gravado → antes do início
// (agendado) → antes do fim (ao vivo) → encerrado aguardando liquidação. Fim exclusivo.
export function lotState(lot: LotTiming, now: Date): LotState {
  if (lot.cancelledAt) return "cancelled"
  if (lot.closedAt) return "closed"
  if (now.getTime() < lot.startsAt.getTime()) return "scheduled"
  if (now.getTime() < lot.endsAt.getTime()) return "live"
  return "ended"
}

export type ValidLotInput = {
  sourceItemId: string
  startingBidCents: number
  minIncrementCents: number
  // null = começa agora
  startsAt: Date | null
  endsAt: Date
}

// Códigos por campo; a interface traduz
export type FieldErrors = Record<string, string[]>

function parseCents(value: unknown, field: string, errors: FieldErrors): number | null {
  if (value === undefined || value === null || value === "") {
    errors[field] = ["REQUIRED"]
    return null
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    errors[field] = ["MUST_BE_POSITIVE_INTEGER"]
    return null
  }
  if (value > RULES.AMOUNT_MAX_CENTS) {
    errors[field] = ["TOO_LARGE"]
    return null
  }
  return value
}

function parseDate(value: unknown, field: string, errors: FieldErrors): Date | null {
  if (typeof value !== "string" || value === "") {
    errors[field] = ["REQUIRED"]
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    errors[field] = ["INVALID_DATE"]
    return null
  }
  return date
}

// Valida a criação de um lote e devolve todos os erros de uma vez (BR-LOT-01, BR-LOT-02)
export function validateLotInput(
  raw: Record<string, unknown>,
  now: Date,
): { ok: true; value: ValidLotInput } | { ok: false; fields: FieldErrors } {
  const fields: FieldErrors = {}

  const sourceItemId = typeof raw.sourceItemId === "string" ? raw.sourceItemId.trim() : ""
  if (!sourceItemId || sourceItemId.length > 100) fields.sourceItemId = ["REQUIRED"]

  const startingBidCents = parseCents(raw.startingBidCents, "startingBidCents", fields)
  const minIncrementCents = parseCents(raw.minIncrementCents, "minIncrementCents", fields)

  // Início ausente ou null = "agora"
  const startsAt = raw.startsAt === undefined || raw.startsAt === null ? null : parseDate(raw.startsAt, "startsAt", fields)
  if (startsAt && startsAt.getTime() < now.getTime()) fields.startsAt = ["IN_THE_PAST"]

  const endsAt = parseDate(raw.endsAt, "endsAt", fields)
  const effectiveStart = startsAt ?? now

  if (endsAt && !fields.startsAt) {
    if (endsAt.getTime() <= effectiveStart.getTime()) {
      fields.endsAt = ["MUST_BE_AFTER_START"]
    } else if (endsAt.getTime() - effectiveStart.getTime() < RULES.LOT_MIN_DURATION_MS) {
      fields.endsAt = ["DURATION_TOO_SHORT"]
    }
  }

  if (Object.keys(fields).length > 0 || startingBidCents === null || minIncrementCents === null || !endsAt) {
    return { ok: false, fields }
  }

  return { ok: true, value: { sourceItemId, startingBidCents, minIncrementCents, startsAt, endsAt } }
}
