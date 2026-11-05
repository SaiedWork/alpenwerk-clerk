import { createHmac, timingSafeEqual } from "node:crypto";

export const SIGNATURE_HEADER = "x-signature";
export const TIMESTAMP_HEADER = "x-timestamp";
/** Replay window: a signed request is accepted for this long (HANDOFF §15). */
export const TIMESTAMP_TOLERANCE_SECONDS = 300;

export type WebhookAuthCode =
  "NOT_CONFIGURED" | "MISSING_SIGNATURE" | "BAD_SIGNATURE" | "STALE_TIMESTAMP";

/** Why a webhook request was rejected. Messages never contain the secret or the body. */
export class WebhookAuthError extends Error {
  constructor(
    readonly code: WebhookAuthCode,
    message: string,
  ) {
    super(message);
    this.name = "WebhookAuthError";
  }
}

/**
 * Hex HMAC-SHA256 over `"<timestamp>.<rawBody>"`. The timestamp is part of the signed text, so
 * an attacker cannot replay an old body with a fresh timestamp.
 */
export function signBody(
  secret: string,
  timestamp: string,
  rawBody: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
}

/**
 * Throws `WebhookAuthError` unless the signature matches and the timestamp (unix seconds) is
 * within the tolerance. With no secret configured everything is rejected (fail closed).
 */
export function verifySignature(options: {
  secret: string | undefined;
  signature: string | null;
  timestamp: string | null;
  rawBody: string;
  now: Date;
}): void {
  const { secret, signature, timestamp, rawBody, now } = options;
  if (!secret) {
    throw new WebhookAuthError(
      "NOT_CONFIGURED",
      "INBOUND_WEBHOOK_SECRET is not set",
    );
  }
  if (!signature || !timestamp) {
    throw new WebhookAuthError(
      "MISSING_SIGNATURE",
      "X-Signature and X-Timestamp headers are required",
    );
  }

  // A malformed signature is rejected before comparing: timingSafeEqual needs equal lengths.
  const expected = Buffer.from(signBody(secret, timestamp, rawBody), "hex");
  const provided = /^[0-9a-fA-F]{64}$/.test(signature)
    ? Buffer.from(signature, "hex")
    : null;
  if (!provided || !timingSafeEqual(provided, expected)) {
    throw new WebhookAuthError("BAD_SIGNATURE", "Signature does not match");
  }

  const sentAt = /^\d{1,12}$/.test(timestamp) ? Number(timestamp) : NaN;
  const ageSeconds = Math.abs(now.getTime() / 1000 - sentAt);
  if (!(ageSeconds <= TIMESTAMP_TOLERANCE_SECONDS)) {
    throw new WebhookAuthError(
      "STALE_TIMESTAMP",
      `Timestamp is outside the ±${TIMESTAMP_TOLERANCE_SECONDS}s window`,
    );
  }
}
