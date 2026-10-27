import { Suspense } from "react"
import { RoomView } from "@/components/views/room"

// O id vem de useParams no cliente; a sala é toda atualizada por polling
export default function LotPage() {
  return (
    <Suspense>
      <RoomView />
    </Suspense>
  )
}
