import { env } from "@/lib/env"

// Relógio único do servidor. Código de negócio nunca chama new Date() ou Date.now() direto.
// O deslocamento fica no globalThis para valer em todos os módulos do mesmo processo.
const state = globalThis as unknown as { clockOffsetMs?: number }

export const clock = {
  now(): Date {
    return new Date(this.nowMs())
  },

  nowMs(): number {
    return Date.now() + (state.clockOffsetMs ?? 0)
  },

  // Só em modo de teste: adianta ou atrasa o relógio (ex.: pular para o fim de um lote)
  setOffset(offsetMs: number) {
    if (!env.TEST_MODE) {
      throw new Error("clock.setOffset só funciona com TEST_MODE=1")
    }
    state.clockOffsetMs = offsetMs
  },

  getOffset(): number {
    return state.clockOffsetMs ?? 0
  },
}

export type Clock = typeof clock
