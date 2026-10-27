// Constantes de regra de negócio. Cada regra tem um ID (BR-...) citado no código e nos testes.

const SECOND = 1000
const MINUTE = 60 * SECOND

export const RULES = {
  // BR-LOT-01: um lote dura no mínimo 5 minutos
  LOT_MIN_DURATION_MS: 5 * MINUTE,

  // BR-EXT-01: lance aceito quando restam ≤ 2 min dispara prorrogação
  EXTENSION_WINDOW_MS: 2 * MINUTE,
  // BR-EXT-02: a prorrogação soma 2 min ao fim atual (não ao horário do lance)
  EXTENSION_STEP_MS: 2 * MINUTE,
  // BR-EXT-03: a soma das prorrogações de um lote não passa de 10 min
  EXTENSION_CAP_MS: 10 * MINUTE,

  // BR-WAL-01: teto por depósito (R$ 1.000.000,00)
  DEPOSIT_MAX_CENTS: 100_000_000,
  // BR-WAL-02: teto do total da carteira (as colunas são int4 no banco)
  WALLET_MAX_TOTAL_CENTS: 2_000_000_000,

  // BR-LOT-02: teto de lance inicial, incremento e lance (R$ 10.000.000,00)
  AMOUNT_MAX_CENTS: 1_000_000_000,
  // BR-LOT-03: vitrine pagina de 12 em 12
  SHOWCASE_PAGE_SIZE: 12,

  // BR-SET-01: quantos lotes vencidos cada varredura fecha
  SETTLEMENT_BATCH_SIZE: 50,

  // BR-RT-01: intervalos de polling (logado na sala, visitante na sala, vitrine)
  POLL_ROOM_AUTHENTICATED_MS: 2 * SECOND,
  POLL_ROOM_VISITOR_MS: 5 * SECOND,
  POLL_SHOWCASE_MS: 10 * SECOND,

  // BR-SEC-01: passe de leitura do Turnstile vale 4 min
  TURNSTILE_PASS_TTL_MS: 4 * MINUTE,
  // BR-SEC-02: verificação do token na Cloudflare tem timeout de 4 s (falha fechada)
  TURNSTILE_VERIFY_TIMEOUT_MS: 4 * SECOND,

  // BR-CAT-01: intervalo mínimo entre chamadas à Scryfall
  SCRYFALL_MIN_INTERVAL_MS: 100,
  // BR-CAT-02: timeout de cada chamada à Scryfall
  SCRYFALL_TIMEOUT_MS: 5 * SECOND,

  // BR-AUTH-01: senha com no mínimo 8 caracteres
  PASSWORD_MIN_LENGTH: 8,
} as const
