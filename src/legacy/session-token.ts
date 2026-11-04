import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// Stateless, HMAC-signed login token: `<base64url payload>.<base64url signature>`.
// Pure (no cookies, no clock access) so it can be unit tested. Demo-grade, not a JWT library.

const payloadSchema = z.object({
  /** Operator username. */
  sub: z.string().min(1),
  /** Expiry as epoch milliseconds. */
  exp: z.number().int(),
});

export type SessionPayload = z.infer<typeof payloadSchema>;

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function createSessionToken(
  payload: SessionPayload,
  secret: string,
): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

/** Returns the payload for a valid, unexpired token and `null` for anything else. */
export function verifySessionToken(
  token: string,
  secret: string,
  now: Date,
): SessionPayload | null {
  const [body, signature, ...rest] = token.split(".");
  if (!body || !signature || rest.length > 0) return null;

  const expected = Buffer.from(sign(body, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  try {
    const parsed = payloadSchema.safeParse(
      JSON.parse(Buffer.from(body, "base64url").toString("utf8")),
    );
    if (!parsed.success || parsed.data.exp <= now.getTime()) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
