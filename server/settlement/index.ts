// Domínio settlement: liquidação de lotes encerrados e comprovantes.
// Outros domínios importam só deste arquivo, nunca de arquivos internos.
export { generateReceiptCode, normalizeReceiptCode, RECEIPT_CODE_ALPHABET, RECEIPT_CODE_LENGTH } from "@/server/settlement/receipt-code"
export { closeLot, closeDueLots, withSettlementPaused, getReceipt, listWins, type CloseLotResult } from "@/server/settlement/service"
export { startSettlementSweeper } from "@/server/settlement/sweeper"
