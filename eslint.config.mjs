import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-e2e/**",
    "playwright-report/**",
    "test-results/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Exemplos de código das skills do Claude Code (não fazem parte do app)
    ".claude/**",
    // Projeto do vídeo (Remotion) tem o próprio lint; o gravador (video/record) segue o do app
    "video/node_modules/**",
    "video/src/**",
    "video/out/**",
    "video/remotion.config.ts",
    "video/eslint.config.mjs",
  ]),
]);

export default eslintConfig;
