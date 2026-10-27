// Domínio audit: cadeia de auditoria por lote e pseudônimos públicos.
// Outros domínios importam só deste arquivo, nunca de arquivos internos.
import { append } from "@/server/audit/service"

export { canonicalJson, computeHash, checkChain, GENESIS, type ChainEntry, type ChainCheck } from "@/server/audit/chain"
export { pseudonymFor } from "@/server/audit/pseudonym"
export { verifyLot, type AuditFact, type AuditFactType, type AuditProblem } from "@/server/audit/service"

export const audit = { append }
