import { assertSafeToReset } from "./guard";

/** Wipes and reseeds the database from .env.local, the same code path as `pnpm db:reset`. */
export default async function globalSetup() {
  const host = assertSafeToReset(process.env);
  // Imported late so the guard runs before `@/lib/env` parses anything.
  const { resetDatabase } = await import("../src/db/reset");
  console.log(`e2e: resetting database on ${host}`);
  await resetDatabase();
}
