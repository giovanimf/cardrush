import { randomBytes } from "node:crypto"

// Alfabeto sem caracteres ambíguos: sem 0 O 1 I L (31 símbolos)
export const RECEIPT_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
export const RECEIPT_CODE_LENGTH = 12

// Maior múltiplo de 31 que cabe num byte: bytes acima dele são descartados (amostragem por
// rejeição), para cada símbolo ter a mesma chance
const LIMIT = 256 - (256 % RECEIPT_CODE_ALPHABET.length)

// Código do comprovante: 12 símbolos de um gerador criptográfico (BR-SET-02)
export function generateReceiptCode(): string {
  let code = ""

  while (code.length < RECEIPT_CODE_LENGTH) {
    for (const byte of randomBytes(RECEIPT_CODE_LENGTH * 2)) {
      if (byte >= LIMIT) continue
      code += RECEIPT_CODE_ALPHABET[byte % RECEIPT_CODE_ALPHABET.length]
      if (code.length === RECEIPT_CODE_LENGTH) break
    }
  }

  return code
}

// Normaliza o código digitado (maiúsculas, sem espaços e hífens)
export function normalizeReceiptCode(value: string): string | null {
  const code = value.toUpperCase().replace(/[\s-]/g, "")
  const valid = code.length === RECEIPT_CODE_LENGTH && [...code].every((char) => RECEIPT_CODE_ALPHABET.includes(char))
  return valid ? code : null
}
