import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { LEGACY_USER: "clerk" } }));

describe("resetDatabase configuration", () => {
  it("fails with a typed error before touching the database when credentials are missing", async () => {
    const { resetDatabase } = await import("@/db/reset");
    await expect(resetDatabase()).rejects.toMatchObject({
      code: "RESET_NOT_CONFIGURED",
      message: expect.stringContaining("LEGACY_PASSWORD"),
    });
  });
});
