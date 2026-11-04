import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("never stores the plaintext and salts every hash", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toContain("same");
    expect(a).not.toBe(b);
  });

  it("rejects malformed stored values", async () => {
    expect(await verifyPassword("x", "plaintext")).toBe(false);
    expect(await verifyPassword("x", "md5$aa$bb")).toBe(false);
  });
});
