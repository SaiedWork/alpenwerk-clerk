import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Schema `legacy`: the mock "Bestandsführung" system. Column names are German on purpose,
 * like a real legacy system. Only `src/legacy/**` and the seed code may import this file;
 * `src/agent/**` reaches the data through the browser only (enforced by ESLint).
 */
export const legacySchema = pgSchema("legacy");

export const policyStatuses = ["aktiv", "ruhend", "storniert"] as const;
export const mandateStatuses = ["aktiv", "widerrufen"] as const;

export const policyStatusEnum = legacySchema.enum(
  "policy_status",
  policyStatuses,
);
export const mandateStatusEnum = legacySchema.enum(
  "mandate_status",
  mandateStatuses,
);

export const customers = legacySchema.table("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  anrede: text("anrede").notNull(),
  vorname: text("vorname").notNull(),
  nachname: text("nachname").notNull(),
  geburtsdatum: date("geburtsdatum", { mode: "string" }).notNull(),
  email: text("email").notNull(),
  strasse: text("strasse").notNull(),
  hausnr: text("hausnr").notNull(),
  plz: text("plz").notNull(),
  ort: text("ort").notNull(),
  land: text("land").notNull().default("Deutschland"),
});

export const policies = legacySchema.table(
  "policies",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    policyNo: text("policy_no").notNull(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    produkt: text("produkt").notNull(),
    status: policyStatusEnum("status").notNull().default("aktiv"),
    beitragMonatlich: numeric("beitrag_monatlich", {
      precision: 10,
      scale: 2,
    }).notNull(),
    beginn: date("beginn", { mode: "string" }).notNull(),
    // Seeded number, never calculated: this is a demo, not actuarial software.
    rueckkaufswertIndikativ: numeric("rueckkaufswert_indikativ", {
      precision: 12,
      scale: 2,
    }).notNull(),
    unwiderruflicheBezugsberechtigung: boolean(
      "unwiderrufliche_bezugsberechtigung",
    )
      .notNull()
      .default(false),
  },
  (t) => [
    uniqueIndex("policies_policy_no_idx").on(t.policyNo),
    index("policies_customer_idx").on(t.customerId),
  ],
);

export const sepaMandates = legacySchema.table(
  "sepa_mandates",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    iban: text("iban").notNull(),
    kontoinhaber: text("kontoinhaber").notNull(),
    mandatsref: text("mandatsref").notNull(),
    status: mandateStatusEnum("status").notNull().default("aktiv"),
    signedOn: date("signed_on", { mode: "string" }).notNull(),
  },
  (t) => [index("sepa_mandates_customer_idx").on(t.customerId)],
);

/** Written by the legacy forms on every change; `changed_by` is 'digital-clerk' for agent edits. */
export const changeLog = legacySchema.table(
  "change_log",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    policyId: integer("policy_id")
      .notNull()
      .references(() => policies.id),
    field: text("field").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    changedAt: timestamp("changed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    changedBy: text("changed_by").notNull(),
  },
  (t) => [index("change_log_policy_idx").on(t.policyId)],
);

/** The single operator account the agent logs in with. Demo only; password is hashed. */
export const legacyUsers = legacySchema.table(
  "legacy_users",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
  },
  (t) => [uniqueIndex("legacy_users_username_idx").on(t.username)],
);
