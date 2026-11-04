import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The bundled Chromium resolves its binary by relative path, so it must not be bundled.
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
