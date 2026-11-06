// Pure checks that keep the e2e run away from anything but a local app on a dev database.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function assertSafeToReset(env: Record<string, string | undefined>) {
  if (env.VERCEL_ENV === "production" || env.NODE_ENV === "production") {
    throw new Error("e2e refuses to run against a production environment.");
  }
  if (!env.DATABASE_URL_UNPOOLED) {
    throw new Error("e2e needs DATABASE_URL_UNPOOLED (.env.local).");
  }
  const base = new URL(env.E2E_BASE_URL ?? "http://localhost:3000");
  if (!LOCAL_HOSTS.has(base.hostname)) {
    throw new Error(`e2e only runs against a local app, not ${base.hostname}.`);
  }
  for (const key of [
    "LEGACY_USER",
    "LEGACY_PASSWORD",
    "INBOUND_WEBHOOK_SECRET",
  ]) {
    if (!env[key]) throw new Error(`e2e needs ${key} (.env.local).`);
  }
  return new URL(env.DATABASE_URL_UNPOOLED).host;
}
