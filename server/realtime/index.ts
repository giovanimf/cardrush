// Domínio realtime: atualização em tempo real.
// Outros domínios importam só deste arquivo, nunca de arquivos internos.
//
// Técnica escolhida (F9.1): polling. O navegador consulta GET /api/lots/:id/room a cada
// 2 s (logado na sala), 5 s (visitante) e a vitrine a cada 10 s (RULES.POLL_*).
// Funciona em qualquer hospedagem, inclusive serverless, sem conexão aberta.
// Para trocar por SSE ou Socket.IO, só esta interface e o hook do navegador mudam.

export const realtime = {
  // Chamado depois do commit de cada mudança no lote. No polling não há o que empurrar:
  // as rotas de estado leem do banco sem cache, então o próximo ciclo já vê a mudança.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async notifyLotChanged(lotId: string): Promise<void> {},
}

// Avisa sem deixar a falha subir para quem chamou: uma falha aqui nunca desfaz um lance
export async function notifyLotChangedSafely(lotId: string) {
  try {
    await realtime.notifyLotChanged(lotId)
  } catch (error) {
    console.error("Falha ao avisar mudança no lote", lotId, error)
  }
}
