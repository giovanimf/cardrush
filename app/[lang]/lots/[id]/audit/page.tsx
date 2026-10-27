import { Suspense } from "react"
import { AuditView } from "@/components/views/audit"

export default function AuditPage() {
  return (
    <Suspense>
      <AuditView />
    </Suspense>
  )
}
