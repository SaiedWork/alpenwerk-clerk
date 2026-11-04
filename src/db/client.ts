import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import { DatabaseConfigError } from "./errors";

export type Db = ReturnType<typeof createDb>;

function createDb() {
  if (!env.DATABASE_URL) throw new DatabaseConfigError("DATABASE_URL");
  // HTTP driver over the pooled connection: one request per query, ideal for serverless.
  // No schema is passed on purpose: queries use the query builder, so this client stays
  // free of any schema import (the agent may use it without touching legacy tables).
  return drizzle({ client: neon(env.DATABASE_URL) });
}

let cached: Db | undefined;

/** Lazy, so `next build` and tests work without a database configured. */
export function getDb(): Db {
  cached ??= createDb();
  return cached;
}
