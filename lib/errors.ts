import { unstable_rethrow } from "next/navigation"

// Catálogo de erros da aplicação: código em inglês, status HTTP e mensagem padrão.
// A interface traduz pelo código; a mensagem aqui é só o texto padrão.
export const ERRORS = {
  AUTH_REQUIRED: { status: 401, message: "Faça login para continuar." },
  FORBIDDEN: { status: 403, message: "Você não tem permissão para esta ação." },
  VALIDATION_FAILED: { status: 422, message: "Dados inválidos." },
  NOT_FOUND: { status: 404, message: "Não encontrado." },
  INTERNAL_ERROR: { status: 500, message: "Erro interno. Tente novamente." },
  TURNSTILE_FAILED: { status: 403, message: "Não conseguimos confirmar que você é humano." },

  BID_INVALID_AMOUNT: { status: 422, message: "Valor de lance inválido." },
  BID_AUCTIONEER_NOT_ALLOWED: { status: 403, message: "Leiloeiros não dão lances." },
  BID_LOT_CANCELLED: { status: 409, message: "Este lote foi cancelado." },
  BID_LOT_NOT_STARTED: { status: 409, message: "Este lote ainda não começou." },
  BID_LOT_ENDED: { status: 409, message: "Este lote já foi encerrado." },
  BID_ALREADY_LEADING: { status: 409, message: "Você já está liderando este lote." },
  BID_BELOW_MINIMUM: { status: 409, message: "O lance está abaixo do mínimo." },
  BID_INSUFFICIENT_BALANCE: { status: 409, message: "Saldo disponível insuficiente." },
  DEPOSIT_INVALID_AMOUNT: { status: 422, message: "Valor de depósito inválido." },

  LOT_NOT_FOUND: { status: 404, message: "Lote não encontrado." },
  LOT_NOT_OWNED: { status: 403, message: "Este lote não é seu." },
  LOT_ITEM_ALREADY_AUCTIONED: { status: 409, message: "Esta carta já está em um lote ativo." },
  LOT_CANCEL_HAS_BIDS: { status: 409, message: "Não é possível cancelar um lote com lances." },
  LOT_CANCEL_ENDED: { status: 409, message: "Não é possível cancelar um lote encerrado." },

  SEARCH_UNAVAILABLE: { status: 503, message: "A busca de cartas está indisponível no momento." },
  SEARCH_RATE_LIMITED: { status: 429, message: "Muitas buscas seguidas. Aguarde um instante." },
  ITEM_UNAVAILABLE: { status: 404, message: "Esta carta não está disponível." },
  RECEIPT_NOT_FOUND: { status: 404, message: "Comprovante não encontrado." },

  EMAIL_ALREADY_REGISTERED: { status: 409, message: "Este e-mail já está cadastrado." },
  INVALID_CREDENTIALS: { status: 401, message: "E-mail ou senha inválidos." },
} as const satisfies Record<string, { status: number; message: string }>

export type ErrorCode = keyof typeof ERRORS

export type ErrorBody = {
  code: ErrorCode
  message: string
  data?: Record<string, unknown>
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly data?: Record<string, unknown>

  constructor(code: ErrorCode, data?: Record<string, unknown>) {
    super(ERRORS[code].message)
    this.name = "AppError"
    this.code = code
    this.data = data
  }

  get status(): number {
    return ERRORS[this.code].status
  }

  toBody(): ErrorBody {
    return { code: this.code, message: this.message, ...(this.data ? { data: this.data } : {}) }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

// Converte qualquer erro em resposta HTTP { code, message, data }.
// Erro desconhecido vira INTERNAL_ERROR, sem vazar detalhes para o cliente.
export function toErrorResponse(error: unknown, init?: ResponseInit): Response {
  // Erros internos do Next (fim do prerender no build, redirect, notFound) voltam para o Next
  unstable_rethrow(error)

  const appError = isAppError(error) ? error : new AppError("INTERNAL_ERROR")

  if (!isAppError(error)) {
    console.error(error)
  }

  return Response.json(appError.toBody(), { ...init, status: appError.status })
}
