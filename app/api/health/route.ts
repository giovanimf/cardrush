// Rota de saúde: sem Turnstile nem sessão
export function GET() {
  return Response.json({ ok: true })
}
