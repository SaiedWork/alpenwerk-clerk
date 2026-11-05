import { describe, expect, it } from "vitest";
import {
  signBody,
  TIMESTAMP_TOLERANCE_SECONDS,
  verifySignature,
  WebhookAuthError,
} from "@/lib/hmac";

const secret = "s3cret";
const body = '{"from":"a@example.org","subject":"s","body":"b"}';
const now = new Date("2026-11-06T10:00:00Z");
const ts = String(now.getTime() / 1000);

function check(overrides: Partial<Parameters<typeof verifySignature>[0]> = {}) {
  verifySignature({
    secret,
    signature: signBody(secret, ts, body),
    timestamp: ts,
    rawBody: body,
    now,
    ...overrides,
  });
}

function codeOf(fn: () => void): string | undefined {
  try {
    fn();
  } catch (error) {
    if (error instanceof WebhookAuthError) return error.code;
    throw error;
  }
  return undefined;
}

describe("verifySignature", () => {
  it("accepts a valid signature", () => {
    expect(codeOf(() => check())).toBeUndefined();
  });

  it("is deterministic and depends on secret, timestamp and body", () => {
    const base = signBody(secret, ts, body);
    expect(signBody(secret, ts, body)).toBe(base);
    expect(signBody("other", ts, body)).not.toBe(base);
    expect(signBody(secret, "1", body)).not.toBe(base);
    expect(signBody(secret, ts, `${body} `)).not.toBe(base);
  });

  it.each([
    ["tampered body", { rawBody: `${body} ` }],
    ["wrong secret", { signature: signBody("other", ts, body) }],
    [
      "swapped timestamp (replay with fresh time)",
      { timestamp: String(Number(ts) + 1) },
    ],
    ["too short", { signature: "abcd" }],
    ["too long", { signature: "a".repeat(65) }],
    ["not hex", { signature: "z".repeat(64) }],
  ])("rejects %s as BAD_SIGNATURE", (_name, override) => {
    expect(codeOf(() => check(override))).toBe("BAD_SIGNATURE");
  });

  it("rejects missing headers", () => {
    expect(codeOf(() => check({ signature: null }))).toBe("MISSING_SIGNATURE");
    expect(codeOf(() => check({ timestamp: null }))).toBe("MISSING_SIGNATURE");
  });

  it("fails closed without a configured secret", () => {
    expect(codeOf(() => check({ secret: undefined }))).toBe("NOT_CONFIGURED");
    expect(codeOf(() => check({ secret: "" }))).toBe("NOT_CONFIGURED");
  });

  describe("replay window", () => {
    const at = (offset: number) => {
      const t = String(Number(ts) + offset);
      return { timestamp: t, signature: signBody(secret, t, body) };
    };
    it("accepts exactly at the boundary, in both directions", () => {
      expect(
        codeOf(() => check(at(-TIMESTAMP_TOLERANCE_SECONDS))),
      ).toBeUndefined();
      expect(
        codeOf(() => check(at(TIMESTAMP_TOLERANCE_SECONDS))),
      ).toBeUndefined();
    });
    it("rejects one second beyond the boundary", () => {
      expect(codeOf(() => check(at(-TIMESTAMP_TOLERANCE_SECONDS - 1)))).toBe(
        "STALE_TIMESTAMP",
      );
      expect(codeOf(() => check(at(TIMESTAMP_TOLERANCE_SECONDS + 1)))).toBe(
        "STALE_TIMESTAMP",
      );
    });
    it("rejects a correctly signed but non-numeric timestamp", () => {
      const t = "yesterday";
      expect(
        codeOf(() =>
          check({ timestamp: t, signature: signBody(secret, t, body) }),
        ),
      ).toBe("STALE_TIMESTAMP");
    });
  });
});
