import { describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import {
  findScreenshot,
  screenshotResponse,
} from "@/features/cases/server/screenshot-response";

describe("screenshotResponse", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

  it("serves the stored bytes with the stored image type", async () => {
    const res = screenshotResponse({ mime: "image/jpeg", data: jpeg });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("content-length")).toBe("4");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toContain("private");
    expect(Buffer.from(await res.arrayBuffer())).toEqual(jpeg);
  });

  it("returns 404 for a missing row", async () => {
    const res = screenshotResponse(null);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "SCREENSHOT_NOT_FOUND" });
  });

  it("refuses to serve a non-image type", () => {
    expect(
      screenshotResponse({ mime: "text/html", data: Buffer.from("<script>") })
        .status,
    ).toBe(404);
  });
});

describe("findScreenshot", () => {
  it("treats a malformed id as a miss without querying the database", async () => {
    const db = new Proxy(
      {},
      {
        get() {
          throw new Error("database must not be touched");
        },
      },
    ) as unknown as Db;
    await expect(findScreenshot(db, "not-a-uuid")).resolves.toBeNull();
  });
});
