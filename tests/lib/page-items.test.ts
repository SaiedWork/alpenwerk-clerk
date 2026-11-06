import { describe, expect, it } from "vitest";
import { pageItems } from "@/lib/page-items";

describe("pageItems", () => {
  it("handles tiny page counts", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(2, 3)).toEqual([1, 2, 3]);
  });

  it("shows first, neighbours and last with ellipses", () => {
    expect(pageItems(1, 10)).toEqual([1, 2, "ellipsis", 10]);
    expect(pageItems(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
    expect(pageItems(10, 10)).toEqual([1, "ellipsis", 9, 10]);
  });

  it("fills a gap of exactly one page instead of an ellipsis", () => {
    expect(pageItems(3, 10)).toEqual([1, 2, 3, 4, "ellipsis", 10]);
    expect(pageItems(8, 10)).toEqual([1, "ellipsis", 7, 8, 9, 10]);
    expect(pageItems(4, 6)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("always keeps page 1 and the last page reachable", () => {
    for (let count = 1; count <= 30; count++) {
      for (let page = 1; page <= count; page++) {
        const items = pageItems(page, count);
        expect(items[0]).toBe(1);
        expect(items.at(-1)).toBe(count);
        expect(items).toContain(page);
      }
    }
  });
});
