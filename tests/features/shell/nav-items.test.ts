import { describe, expect, it } from "vitest";
import { isActivePath, NAV_ITEMS } from "@/features/shell/components/nav-items";

describe("isActivePath", () => {
  it("matches the exact path and sub-paths only", () => {
    expect(isActivePath("/faelle", "/faelle")).toBe(true);
    expect(isActivePath("/faelle/abc", "/faelle")).toBe(true);
    expect(isActivePath("/faelle-x", "/faelle")).toBe(false);
    expect(isActivePath("/audit", "/faelle")).toBe(false);
  });

  it("lists six unique console routes", () => {
    expect(NAV_ITEMS).toHaveLength(6);
    expect(new Set(NAV_ITEMS.map((i) => i.href)).size).toBe(6);
  });
});
