import { createHash, timingSafeEqual } from "node:crypto";

export type CronAuthCode = "NOT_CONFIGURED" | "UNAUTHORIZED";

/** Why a cron request was rejected. Messages never contain the secret or the header value. */
export class CronAuthError extends Error {
  constructor(
    readonly code: CronAuthCode,
    message: string,
  ) {
    super(message);
    this.name = "CronAuthError";
  }
}

// Hashing first gives both sides the same length, so the compare is constant-time
// and does not leak the length of the secret.
const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Throws `CronAuthError` unless it
 * matches. With no secret configured everything is rejected (fail closed).
 */
export function verifyCronAuth(
  authorization: string | null,
  secret: string | undefined,
): void {
  if (!secret) {
    throw new CronAuthError("NOT_CONFIGURED", "CRON_SECRET is not set");
  }
  const matches =
    authorization !== null &&
    timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`));
  if (!matches) {
    throw new CronAuthError("UNAUTHORIZED", "Missing or wrong bearer token");
  }
}
