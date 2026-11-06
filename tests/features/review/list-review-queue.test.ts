import { describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import {
  countReviewQueue,
  listReviewQueue,
  reviewTask,
} from "@/features/review/server/list-review-queue";

describe("reviewTask", () => {
  it("asks for a decision at the gate and for sending once a draft exists", () => {
    expect(reviewTask("AWAITING_REVIEW")).toBe("review");
    expect(reviewTask("REPLY_READY")).toBe("send");
  });
});

// Reads the real database (run with `node --env-file=.env.local ...`); skipped without one.
describe.skipIf(!process.env.DATABASE_URL)("listReviewQueue (database)", () => {
  it("lists only cases waiting for a human, longest waiting first", async () => {
    const db = getDb();
    const rows = await listReviewQueue(db);
    expect(
      rows.every((r) => ["AWAITING_REVIEW", "REPLY_READY"].includes(r.status)),
    ).toBe(true);
    const times = rows.map((r) => r.updatedAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(await countReviewQueue(db)).toBeGreaterThanOrEqual(rows.length);
  });
});
