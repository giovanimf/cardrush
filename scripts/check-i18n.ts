// Paridade das traduções (FE.2): mesmas chaves em pt e en, em todos os níveis (inclusive nos
// mapas que o TypeScript não confere sozinho, como erros por código), e um texto para cada
// código de erro da API. Roda com: npm run test:i18n
import { en } from "../lib/i18n/en"
import { pt } from "../lib/i18n/pt"
import { ERRORS } from "../lib/errors"

function keys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => keys(item, prefix ? `${prefix}.${key}` : key))
}

const ptKeys = new Set(keys(pt))
const enKeys = new Set(keys(en))
const problems: string[] = []

for (const key of ptKeys) if (!enKeys.has(key)) problems.push(`falta em en: ${key}`)
for (const key of enKeys) if (!ptKeys.has(key)) problems.push(`falta em pt: ${key}`)
for (const code of Object.keys(ERRORS)) {
  if (!(code in pt.errors)) problems.push(`erro sem tradução em pt: ${code}`)
  if (!(code in en.errors)) problems.push(`erro sem tradução em en: ${code}`)
}

if (problems.length > 0) {
  console.error(problems.join("\n"))
  process.exit(1)
}

console.log(`i18n ok: ${ptKeys.size} chaves em pt e en; ${Object.keys(ERRORS).length} códigos de erro traduzidos.`)
