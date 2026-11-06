import { describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { listCases } from "@/features/cases/server/list-cases";

// Reads the real database (run with `node --env-file=.env.local ...`); skipped without one.
describe.skipIf(!process.env.DATABASE_URL)("listCases (database)", () => {
  it("returns a consistent page and applies filters", async () => {
    const db = getDb();
    const all = await listCases(db, { page: 1 }, 5);
    expect(all.rows.length).toBeLessThanOrEqual(5);
    expect(all.pageCount).toBe(Math.max(1, Math.ceil(all.total / 5)));

    const beyond = await listCases(db, { page: 9999 }, 5);
    expect(beyond.page).toBe(beyond.pageCount);

    const done = await listCases(db, { status: "DONE", page: 1 }, 50);
    expect(done.rows.every((r) => r.status === "DONE")).toBe(true);
    const sorted = [...done.rows].sort(
      (a, b) => b.receivedAt.getTime() - a.receivedAt.getTime(),
    );
    expect(done.rows.map((r) => r.id)).toEqual(sorted.map((r) => r.id));
  });
});
