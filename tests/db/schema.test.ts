import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as app from "@/db/schema/app";
import * as legacy from "@/db/schema/legacy";

const schemaOf = (table: PgTable) => getTableConfig(table).schema;

describe("db schema", () => {
  it("keeps the clerk tables in schema `app`", () => {
    const tables = [
      app.cases,
      app.caseEvents,
      app.auditLog,
      app.screenshots,
      app.replies,
      app.reviews,
      app.llmCache,
      app.llmCalls,
      app.rateLimits,
    ];
    expect(tables.map(schemaOf)).toEqual(tables.map(() => "app"));
  });

  it("keeps the mock legacy system in schema `legacy`", () => {
    const tables = [
      legacy.customers,
      legacy.policies,
      legacy.sepaMandates,
      legacy.changeLog,
      legacy.legacyUsers,
    ];
    expect(tables.map(schemaOf)).toEqual(tables.map(() => "legacy"));
  });

  it("covers every case status and intent from the pipeline spec", () => {
    expect(app.caseStatuses).toContain("AWAITING_REVIEW");
    expect(app.caseStatuses).toHaveLength(11);
    expect([...app.intents]).toEqual([
      "address_change",
      "bank_change",
      "termination",
      "other",
    ]);
    expect([...app.decisions]).toEqual([
      "AUTO_EXECUTE",
      "NEEDS_REVIEW",
      "REPLY_ONLY",
    ]);
  });
});
