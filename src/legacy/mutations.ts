import { and, desc, eq } from "drizzle-orm";
import { withTransaction, type Tx } from "@/db/tx";
import {
  changeLog,
  customers,
  policies,
  sepaMandates,
} from "@/db/schema/legacy";
import type { AddressInput, BankInput } from "./forms";

/** The single operator account is the digital clerk, so every edit is logged as its work. */
const CHANGED_BY = "digital-clerk";

export type ChangeOutcome =
  | { outcome: "changed" | "unchanged" }
  | { outcome: "policy-not-found" }
  | { outcome: "no-mandate" };

/** Same text format as the seeded log entries, so history reads consistently. */
function formatAddress(a: AddressInput): string {
  const base = `${a.strasse} ${a.hausnr}, ${a.plz} ${a.ort}`;
  return a.land.toLowerCase() === "deutschland" ? base : `${base}, ${a.land}`;
}

/** The edit itself, inside the caller's transaction (the demo seed applies it during a reset). */
export async function applyAddressChange(
  tx: Tx,
  policyNo: string,
  input: AddressInput,
): Promise<ChangeOutcome> {
  const [row] = await tx
    .select({ policyId: policies.id, customer: customers })
    .from(policies)
    .innerJoin(customers, eq(policies.customerId, customers.id))
    .where(eq(policies.policyNo, policyNo))
    .limit(1);
  if (!row) return { outcome: "policy-not-found" };

  const current: AddressInput = {
    strasse: row.customer.strasse,
    hausnr: row.customer.hausnr,
    plz: row.customer.plz,
    ort: row.customer.ort,
    land: row.customer.land,
  };
  const oldValue = formatAddress(current);
  const newValue = formatAddress(input);
  // Idempotent: identical data means no write and no log row.
  if (oldValue === newValue) return { outcome: "unchanged" };

  await tx
    .update(customers)
    .set(input)
    .where(eq(customers.id, row.customer.id));
  await tx.insert(changeLog).values({
    policyId: row.policyId,
    field: "adresse",
    oldValue,
    newValue,
    changedBy: CHANGED_BY,
  });
  return { outcome: "changed" };
}

export async function updateAddress(
  policyNo: string,
  input: AddressInput,
): Promise<ChangeOutcome> {
  return withTransaction((tx) => applyAddressChange(tx, policyNo, input));
}

/** The edit itself, inside the caller's transaction. */
export async function applyBankChange(
  tx: Tx,
  policyNo: string,
  input: BankInput,
): Promise<ChangeOutcome> {
  const [row] = await tx
    .select({ policyId: policies.id, customerId: policies.customerId })
    .from(policies)
    .where(eq(policies.policyNo, policyNo))
    .limit(1);
  if (!row) return { outcome: "policy-not-found" };

  const [mandate] = await tx
    .select()
    .from(sepaMandates)
    .where(
      and(
        eq(sepaMandates.customerId, row.customerId),
        eq(sepaMandates.status, "aktiv"),
      ),
    )
    .orderBy(desc(sepaMandates.signedOn))
    .limit(1);
  if (!mandate) return { outcome: "no-mandate" };

  const entries: { field: string; oldValue: string; newValue: string }[] = [];
  if (mandate.iban !== input.iban) {
    entries.push({
      field: "iban",
      oldValue: mandate.iban,
      newValue: input.iban,
    });
  }
  if (mandate.kontoinhaber !== input.kontoinhaber) {
    entries.push({
      field: "kontoinhaber",
      oldValue: mandate.kontoinhaber,
      newValue: input.kontoinhaber,
    });
  }
  if (entries.length === 0) return { outcome: "unchanged" };

  await tx
    .update(sepaMandates)
    .set({ iban: input.iban, kontoinhaber: input.kontoinhaber })
    .where(eq(sepaMandates.id, mandate.id));
  await tx.insert(changeLog).values(
    entries.map((entry) => ({
      ...entry,
      policyId: row.policyId,
      changedBy: CHANGED_BY,
    })),
  );
  return { outcome: "changed" };
}

export async function updateBank(
  policyNo: string,
  input: BankInput,
): Promise<ChangeOutcome> {
  return withTransaction((tx) => applyBankChange(tx, policyNo, input));
}
