import type { Metadata } from "next"
import { VerifyView } from "@/components/views/verify"

export const metadata: Metadata = { robots: { index: false } }

export default function VerifyPage() {
  return <VerifyView />
}
