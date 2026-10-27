import { Suspense } from "react"
import { ShowcaseView } from "@/components/views/showcase"

// A aba vem de ?tab= (useSearchParams), por isso o Suspense
export default function LotsPage() {
  return (
    <Suspense>
      <ShowcaseView />
    </Suspense>
  )
}
