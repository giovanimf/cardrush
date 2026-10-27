// Dinheiro sempre em centavos inteiros (*Cents), nunca float.

// Agrupamento de milhar sem decimais, só com ponto (padrão brasileiro): "1.234", "1.234.567".
// Vírgula sozinha é sempre decimal: "10,001" tem 3 casas e é recusado (nunca vira dez mil e um).
// O primeiro grupo não começa com zero, então "0.001" também é recusado.
const THOUSANDS_ONLY = /^[1-9]\d{0,2}(\.\d{3})+$/

// Converte texto digitado em centavos. Aceita "1.234,56", "1234,56", "1234.56", "1234" e "1.234".
// Devolve null se o texto for inválido ou tiver mais de 2 casas decimais;
// quem chama decide o código de erro (ex.: DEPOSIT_INVALID_AMOUNT, BID_INVALID_AMOUNT).
// locale "en": vírgula separa milhar e ponto separa decimais (1,234.56); os papéis são trocados
// e o texto segue as mesmas regras do português.
export function parseMoneyToCents(input: string, locale: "pt" | "en" = "pt"): number | null {
  const cleaned = input.trim().replace(/\s/g, "").replace(/^R\$/i, "")
  const text = locale === "en" ? cleaned.replace(/[.,]/g, (char) => (char === "." ? "," : ".")) : cleaned

  if (!/^[\d.,]+$/.test(text)) return null

  let integerPart: string
  let decimalPart = ""

  if (THOUSANDS_ONLY.test(text)) {
    integerPart = text.replace(/[.,]/g, "")
  } else {
    // O último separador é o decimal; os anteriores precisam ser de milhar
    const lastSeparator = Math.max(text.lastIndexOf(","), text.lastIndexOf("."))

    if (lastSeparator === -1) {
      integerPart = text
    } else {
      decimalPart = text.slice(lastSeparator + 1)
      integerPart = text.slice(0, lastSeparator)

      const decimalSeparator = text[lastSeparator]
      const groupSeparator = decimalSeparator === "," ? "." : ","

      if (integerPart.includes(decimalSeparator)) return null
      if (integerPart.includes(groupSeparator)) {
        const grouped = new RegExp(`^[1-9]\\d{0,2}(\\${groupSeparator}\\d{3})+$`)
        if (!grouped.test(integerPart)) return null
        integerPart = integerPart.replaceAll(groupSeparator, "")
      }
    }
  }

  if (!/^\d+$/.test(integerPart) || !/^\d{0,2}$/.test(decimalPart)) return null

  const cents = Number(integerPart) * 100 + Number(decimalPart.padEnd(2, "0"))

  return Number.isSafeInteger(cents) ? cents : null
}

export function formatMoney(cents: number, locale = "pt-BR", currency = "BRL"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100)
}
