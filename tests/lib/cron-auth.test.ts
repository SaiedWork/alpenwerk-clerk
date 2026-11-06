import { describe, expect, it } from "vitest";
import { CronAuthError, verifyCronAuth } from "@/lib/cron-auth";

const secret = "0123456789abcdef-secret";

const codeOf = (authorization: string | null, configured?: string) => {
  try {
    verifyCronAuth(authorization, configured);
    return "OK";
  } catch (error) {
    if (!(error instanceof CronAuthError)) throw error;
    return error.code;
  }
};

describe("verifyCronAuth", () => {
  it.each([
    ["correct bearer token", `Bearer ${secret}`, secret, "OK"],
    ["no secret configured", `Bearer ${secret}`, undefined, "NOT_CONFIGURED"],
    ["no secret and no header", null, undefined, "NOT_CONFIGURED"],
    ["missing header", null, secret, "UNAUTHORIZED"],
    ["empty header", "", secret, "UNAUTHORIZED"],
    ["wrong scheme", `Basic ${secret}`, secret, "UNAUTHORIZED"],
    ["token without scheme", secret, secret, "UNAUTHORIZED"],
    ["wrong token", "Bearer nope", secret, "UNAUTHORIZED"],
    ["token of another length", `Bearer ${secret}x`, secret, "UNAUTHORIZED"],
    ["lower-case scheme", `bearer ${secret}`, secret, "UNAUTHORIZED"],
  ])("%s", (_name, header, configured, expected) => {
    expect(codeOf(header, configured)).toBe(expected);
  });

  it("never puts the secret or the header in the message", () => {
    try {
      verifyCronAuth("Bearer guess-123", secret);
    } catch (error) {
      expect((error as Error).message).not.toContain(secret);
      expect((error as Error).message).not.toContain("guess-123");
    }
  });
});
