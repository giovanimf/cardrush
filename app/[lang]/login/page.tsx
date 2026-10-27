import { Suspense } from "react"
import { LoginView } from "@/components/views/auth"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  )
}
