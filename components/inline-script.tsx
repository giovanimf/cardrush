"use client"

// Script que roda durante o parse do HTML. No cliente vira text/plain: o React não reclama de <script>
// ao renderizar o layout de novo (troca de idioma) e o script não roda duas vezes.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
