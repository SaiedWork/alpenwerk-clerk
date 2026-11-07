import type { NextConfig } from "next";

// Every route that can end up running the pipeline (and so launching the browser) needs these
// files in its function: the inbound webhook, the resume route, and the two pages whose server
// actions call `runCase` (simulator submit, review approve/reject).
const browserFiles = [
  "./node_modules/playwright-core/**/*",
  "./node_modules/@sparticuz/chromium/**/*",
];
// The keys are globs, so `[id]` would read as a character class: dynamic segments use `*`.
const routesThatRunThePipeline = [
  "/api/inbound/email",
  "/api/cases/*/run",
  "/posteingang",
  "/faelle/*",
];

// Baseline response headers. No CSP on purpose: the console relies on inline theme and
// Next.js scripts, and a wrong policy would break the demo. The whole demo is also noindex.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  // Stops `next dev` from generating an AGENTS.md in the working tree.
  agentRules: false,
  // The bundled Chromium resolves its binary by relative path, so it must not be bundled.
  // File tracing misses data files that these packages read at runtime
  // (playwright-core/browsers.json, the Chromium binary), so ship them explicitly.
  outputFileTracingIncludes: Object.fromEntries(
    routesThatRunThePipeline.map((route) => [route, browserFiles]),
  ),
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
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
