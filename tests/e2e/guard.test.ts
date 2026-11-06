import { describe, expect, it } from "vitest";
import { assertSafeToReset } from "../../e2e/guard";

const ok = {
  DATABASE_URL_UNPOOLED: "postgres://u:p@ep-dev.example.neon.tech/db",
  LEGACY_USER: "clerk",
  LEGACY_PASSWORD: "x",
  INBOUND_WEBHOOK_SECRET: "y",
};

describe("assertSafeToReset", () => {
  it("returns the database host for a local dev setup", () => {
    expect(assertSafeToReset(ok)).toBe("ep-dev.example.neon.tech");
  });

  it("refuses production", () => {
    expect(() =>
      assertSafeToReset({ ...ok, VERCEL_ENV: "production" }),
    ).toThrow(/production/);
  });

  it("refuses a non-local app URL", () => {
    expect(() =>
      assertSafeToReset({ ...ok, E2E_BASE_URL: "https://demo.vercel.app" }),
    ).toThrow(/local/);
  });

  it("needs a database and the legacy credentials", () => {
    expect(() =>
      assertSafeToReset({ ...ok, DATABASE_URL_UNPOOLED: undefined }),
    ).toThrow(/DATABASE_URL_UNPOOLED/);
    expect(() =>
      assertSafeToReset({ ...ok, LEGACY_PASSWORD: undefined }),
    ).toThrow(/LEGACY_PASSWORD/);
  });
});
