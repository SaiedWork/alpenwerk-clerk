import { describe, expect, it } from "vitest";
import {
  FOOTER_NAV_ITEMS,
  isActivePath,
  NAV_ITEMS,
} from "@/features/shell/components/nav-items";

describe("isActivePath", () => {
  it("matches the exact path and sub-paths only", () => {
    expect(isActivePath("/faelle", "/faelle")).toBe(true);
    expect(isActivePath("/faelle/abc", "/faelle")).toBe(true);
    expect(isActivePath("/faelle-x", "/faelle")).toBe(false);
    expect(isActivePath("/audit", "/faelle")).toBe(false);
  });

  it("lists six unique console routes, the about page in the footer", () => {
    expect(NAV_ITEMS).toHaveLength(5);
    expect(FOOTER_NAV_ITEMS.map((i) => i.href)).toEqual(["/ueber"]);
    const all = [...NAV_ITEMS, ...FOOTER_NAV_ITEMS];
    expect(new Set(all.map((i) => i.href)).size).toBe(6);
  });
});
