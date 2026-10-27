import { createHmac } from "node:crypto"
import { env } from "@/lib/env"

// Mesmo alfabeto sem ambíguos do comprovante (sem 0 O 1 I L)
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

// Pseudônimo de 4 caracteres, estável dentro do lote e diferente entre lotes (BR-AUD-02).
// Rotas públicas mostram só isto: nunca nome, e-mail ou id do licitante.
export function pseudonymFor(lotId: string, userId: string): string {
  const digest = createHmac("sha256", env.PSEUDONYM_SECRET).update(`${lotId}:${userId}`).digest()
  return Array.from(digest.subarray(0, 4), (byte) => ALPHABET[byte % ALPHABET.length]).join("")
}
