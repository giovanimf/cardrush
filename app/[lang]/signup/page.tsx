import { Suspense } from "react"
import { SignupView } from "@/components/views/auth"

export default function SignupPage() {
  return (
    <Suspense>
      <SignupView />
    </Suspense>
  )
}
