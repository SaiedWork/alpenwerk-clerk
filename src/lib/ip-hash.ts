import { createHmac } from "node:crypto";

/** `IP_HASH_SALT` is missing: refusing to produce an unsalted (guessable) IP hash. */
export class IpHashConfigError extends Error {
  readonly code = "IP_HASH_NOT_CONFIGURED";
  constructor() {
    super("IP_HASH_SALT is not set");
    this.name = "IpHashConfigError";
  }
}

/** First hop of `x-forwarded-for` (the client as seen by the platform proxy), or `null`. */
export function clientIp(headers: Headers): string | null {
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first ? first : null;
}

/**
 * Salted keyed hash of an IP address. Raw IPs are never stored or logged (HANDOFF §15); the
 * IPv4 space is tiny, so the hash is only safe because the salt is secret.
 */
export function hashIp(ip: string, salt: string | undefined): string {
  if (!salt) throw new IpHashConfigError();
  return createHmac("sha256", salt).update(ip).digest("hex");
}
