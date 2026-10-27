import { Suspense } from "react"
import { ReceiptView } from "@/components/views/receipt"

export default function ReceiptPage() {
  return (
    <Suspense>
      <ReceiptView />
    </Suspense>
  )
}
