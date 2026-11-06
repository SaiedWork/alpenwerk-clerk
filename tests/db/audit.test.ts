import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { auditEntrySchema } from "@/db/audit";

describe("auditEntrySchema", () => {
  const base = { caseId: null, actor: "system", action: "case.received" };

  it("accepts the known detail keys and defaults details to {}", () => {
    expect(auditEntrySchema.parse(base).details).toEqual({});
    expect(
      auditEntrySchema.parse({
        ...base,
        details: { step: "evaluate", reasonCodes: ["BANK_NON_DE"] },
      }).details,
    ).toEqual({ step: "evaluate", reasonCodes: ["BANK_NON_DE"] });
  });

  it("rejects unknown keys (no room for email text or an IBAN)", () => {
    expect(() =>
      auditEntrySchema.parse({ ...base, details: { iban: "DE89" } }),
    ).toThrow();
    expect(() => auditEntrySchema.parse({ ...base, actor: "robot" })).toThrow();
    expect(() => auditEntrySchema.parse({ ...base, caseId: "x" })).toThrow();
  });
});

// Needs a real database: run with `node --env-file=.env.local` (skipped without a connection).
// Everything happens inside a transaction that is rolled back, so no rows are left behind.
describe.skipIf(!process.env.DATABASE_URL_UNPOOLED)(
  "audit_log trigger (database)",
  () => {
    // Drizzle wraps the driver error; the trigger's message and SQLSTATE sit on `cause`.
    const appendOnlyError = {
      cause: { message: expect.stringMatching(/append-only/), code: "23000" },
    };
    const rollback = new Error("rollback");

    async function inRolledBackTx(
      fn: (tx: Parameters<Parameters<typeof withTx>[0]>[0]) => Promise<void>,
    ) {
      await withTx(fn).catch((e: unknown) => {
        if (e !== rollback) throw e;
      });
    }
    const withTx = async (
      fn: (tx: import("@/db/tx").Tx) => Promise<void>,
    ): Promise<void> => {
      const { withTransaction } = await import("@/db/tx");
      await withTransaction(async (tx) => {
        await fn(tx);
        throw rollback;
      });
    };

    it("allows INSERT and TRUNCATE but rejects UPDATE and DELETE", async () => {
      await inRolledBackTx(async (tx) => {
        const { appendAudit } = await import("@/db/audit");
        await appendAudit(tx, {
          caseId: null,
          actor: "system",
          action: "test.append",
        });
        // A failed statement aborts the transaction, so each probe gets a savepoint.
        await expect(
          tx.transaction((s) =>
            s.execute(sql`UPDATE app.audit_log SET action = 'x'`),
          ),
        ).rejects.toMatchObject(appendOnlyError);
        await expect(
          tx.transaction((s) => s.execute(sql`DELETE FROM app.audit_log`)),
        ).rejects.toMatchObject(appendOnlyError);
        // The reset job relies on this: row-level triggers do not fire for TRUNCATE.
        await tx.execute(sql`TRUNCATE app.audit_log`);
        const left = await tx.execute(sql`SELECT 1 FROM app.audit_log`);
        expect(left.rows).toHaveLength(0);
      });
    });
  },
);
