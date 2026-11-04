import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { env } from "@/lib/env";
import { DatabaseConfigError } from "./errors";

type Pg = ReturnType<typeof drizzle>;
export type Tx = Parameters<Parameters<Pg["transaction"]>[0]>[0];

/**
 * Runs `fn` in one interactive transaction (reset and seed need this; the HTTP driver cannot).
 * Uses the WebSocket driver on the unpooled connection and always closes the pool.
 * Node 22+ provides a global WebSocket, so no `ws` package is needed.
 */
export async function withTransaction<T>(
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (!env.DATABASE_URL_UNPOOLED) {
    throw new DatabaseConfigError("DATABASE_URL_UNPOOLED");
  }
  const pool = new Pool({ connectionString: env.DATABASE_URL_UNPOOLED });
  try {
    return await drizzle(pool).transaction(fn);
  } finally {
    await pool.end();
  }
}
