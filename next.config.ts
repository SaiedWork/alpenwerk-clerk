import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The bundled Chromium resolves its binary by relative path, so it must not be bundled.
  // File tracing misses data files that these packages read at runtime
  // (playwright-core/browsers.json, the Chromium binary), so ship them explicitly.
  outputFileTracingIncludes: {
    "/api/spike": [
      "./node_modules/playwright-core/**/*",
      "./node_modules/@sparticuz/chromium/**/*",
    ],
  },
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
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
