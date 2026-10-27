import { closeDueLots } from "@/server/settlement/service"

// Varredura dentro do próprio processo: uma passada ao subir (lotes que venceram com o servidor
// fora do ar) e depois a cada intervalo. Em produção serverless, usar a rota de cron.
const state = globalThis as unknown as { settlementSweeper?: NodeJS.Timeout; settlementSweepRunning?: boolean }

async function sweep() {
  // Sem passadas sobrepostas quando uma demora mais que o intervalo
  if (state.settlementSweepRunning) return
  state.settlementSweepRunning = true

  try {
    const summary = await closeDueLots()
    if (summary.closed > 0 || summary.failed > 0) console.log("Varredura de lotes:", summary)
  } catch (error) {
    console.error("Falha na varredura de lotes", error)
  } finally {
    state.settlementSweepRunning = false
  }
}

export function startSettlementSweeper(intervalMs: number) {
  if (intervalMs <= 0 || state.settlementSweeper) return

  void sweep()
  state.settlementSweeper = setInterval(() => void sweep(), intervalMs)
  // Não segura o processo vivo só por causa da varredura
  state.settlementSweeper.unref()
}
