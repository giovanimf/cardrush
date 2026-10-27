// Carrega o env na subida do servidor, para a trava de produção barrar o app
// antes do primeiro request (e não só quando alguma rota importar o env).
// Com SETTLEMENT_SWEEP_MS > 0, liga a varredura que fecha lotes vencidos.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { env } = await import("@/lib/env")

    if (env.SETTLEMENT_SWEEP_MS > 0) {
      const { startSettlementSweeper } = await import("@/server/settlement")
      startSettlementSweeper(env.SETTLEMENT_SWEEP_MS)
    }
  }
}
