/** Persistence behind the limiter; the Drizzle version lives in `src/db/rate-limit-store.ts`. */
export interface RateLimitStore {
  /** Atomically adds 1 to the counter of `(key, windowStart)` and returns the new count. */
  increment(key: string, windowStart: Date): Promise<number>;
  /** Deletes the counter, e.g. to give back a one-time claim after a failed action. */
  release(key: string, windowStart: Date): Promise<void>;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  /** When the current window ends and the counter starts again. */
  resetAt: Date;
}

/**
 * Fixed-window limiter: at most `limit` hits per `windowSeconds`, windows aligned to the epoch.
 * Every call counts, including rejected ones. Simple and good enough for a demo: a burst across
 * a window boundary can briefly reach twice the limit.
 */
export async function hitRateLimit(options: {
  store: RateLimitStore;
  key: string;
  limit: number;
  windowSeconds: number;
  now: Date;
}): Promise<RateLimitResult> {
  const { store, key, limit, windowSeconds, now } = options;
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const count = await store.increment(key, windowStart);
  return {
    allowed: count <= limit,
    count,
    remaining: Math.max(0, limit - count),
    resetAt: new Date(windowStart.getTime() + windowMs),
  };
}

/** One-time claims use a single fixed window, so a key can never slip through a boundary. */
export const ONCE_WINDOW_START = new Date(0);

/** `true` for the first caller with this key, `false` for every later one (atomic). */
export async function claimOnce(
  store: RateLimitStore,
  key: string,
): Promise<boolean> {
  return (await store.increment(key, ONCE_WINDOW_START)) === 1;
}

/** Gives a claim back, so a retry of the same request can succeed after a server-side failure. */
export function releaseClaim(
  store: RateLimitStore,
  key: string,
): Promise<void> {
  return store.release(key, ONCE_WINDOW_START);
}
