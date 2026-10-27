import { Suspense } from "react"
import { NewLotView } from "@/components/views/new-lot"

// O formulário já vem com início e fim sugeridos a partir da hora atual (Date.now):
// em Suspense, é renderizado a cada visita em vez de entrar no prerender
export default function NewLotPage() {
  return (
    <Suspense>
      <NewLotView />
    </Suspense>
  )
}
