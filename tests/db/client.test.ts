import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: {} }));

describe("db access without configuration", () => {
  it("getDb throws a typed error when DATABASE_URL is missing", async () => {
    const { getDb } = await import("@/db/client");
    expect(() => getDb()).toThrowError(
      expect.objectContaining({ code: "DB_NOT_CONFIGURED" }),
    );
  });

  it("withTransaction throws a typed error when DATABASE_URL_UNPOOLED is missing", async () => {
    const { withTransaction } = await import("@/db/tx");
    await expect(withTransaction(async () => 1)).rejects.toMatchObject({
      code: "DB_NOT_CONFIGURED",
    });
  });
});
