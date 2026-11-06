import { describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { listAudit } from "@/features/audit/server/list-audit";

// Reads the real database (run with `node --env-file=.env.local ...`); skipped without one.
describe.skipIf(!process.env.DATABASE_URL)("listAudit (database)", () => {
  it("returns newest first and applies filters", async () => {
    const db = getDb();
    const all = await listAudit(db, { page: 1 }, 10);
    const times = all.rows.map((r) => r.at.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(all.pageCount).toBe(Math.max(1, Math.ceil(all.total / 10)));

    const human = await listAudit(db, { page: 1, actor: "human" }, 50);
    expect(human.rows.every((r) => r.actor === "human")).toBe(true);

    const replies = await listAudit(db, { page: 1, kind: "reply" }, 50);
    expect(replies.rows.every((r) => r.action.startsWith("reply."))).toBe(true);

    const beyond = await listAudit(db, { page: 9999 }, 10);
    expect(beyond.page).toBe(beyond.pageCount);
  });
});
