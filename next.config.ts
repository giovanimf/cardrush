import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O servidor dos testes E2E usa outra pasta (.next-e2e) para rodar ao lado do next dev
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["@prisma/client"],
  poweredByHeader: false,
  // Cabeçalhos de segurança em todas as respostas. A CSP não restringe scripts (o Next e o
  // Turnstile usam scripts inline e de terceiros); ela impede o site de ser embutido em
  // iframe (clickjacking nos botões de lance) e fecha base-uri, form-action e object-src.
  async headers() {
    const security = [
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      ...(process.env.NODE_ENV === "production"
        ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
        : []),
    ]
    return [{ source: "/:path*", headers: security }]
  },
  experimental: {
    agentFeedback: true,
    // 404 de URLs sem rota: o layout raiz fica em app/[lang], então usa app/global-not-found.tsx
    globalNotFound: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
