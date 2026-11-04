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
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Boundary: the agent may only reach the legacy system through the browser driver,
  // never by importing its code or database schema.
  {
    files: ["src/agent/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/legacy", "@/legacy/**", "**/legacy", "**/legacy/**"],
              message:
                "src/agent must not import from src/legacy. Use the LegacyDriver (browser) instead.",
            },
            {
              group: ["@/db/schema/legacy*", "**/schema/legacy*"],
              message:
                "src/agent must not import the legacy DB schema. Read and write through the browser only.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
