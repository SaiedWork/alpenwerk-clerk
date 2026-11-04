import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/legacy/session-token";

const SECRET = "a".repeat(32);
const NOW = new Date("2026-01-01T12:00:00Z");
const LATER = NOW.getTime() + 3_600_000;

describe("session token", () => {
  it("round-trips a valid token", () => {
    const token = createSessionToken({ sub: "clerk", exp: LATER }, SECRET);
    expect(verifySessionToken(token, SECRET, NOW)).toEqual({
      sub: "clerk",
      exp: LATER,
    });
  });

  it("rejects an expired token", () => {
    const token = createSessionToken(
      { sub: "clerk", exp: NOW.getTime() },
      SECRET,
    );
    expect(verifySessionToken(token, SECRET, NOW)).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const token = createSessionToken(
      { sub: "clerk", exp: LATER },
      "b".repeat(32),
    );
    expect(verifySessionToken(token, SECRET, NOW)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = createSessionToken({ sub: "clerk", exp: LATER }, SECRET);
    const forged = Buffer.from(
      JSON.stringify({ sub: "admin", exp: LATER }),
    ).toString("base64url");
    expect(
      verifySessionToken(`${forged}.${token.split(".")[1]}`, SECRET, NOW),
    ).toBeNull();
  });

  it.each(["", "garbage", "a.b.c", "."])(
    "rejects malformed token %j",
    (token) => {
      expect(verifySessionToken(token, SECRET, NOW)).toBeNull();
    },
  );
});
