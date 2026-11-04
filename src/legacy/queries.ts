import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  changeLog,
  customers,
  legacyUsers,
  policies,
  sepaMandates,
} from "@/db/schema/legacy";
import { toLikePattern } from "./search";

export async function findOperator(username: string) {
  const [operator] = await getDb()
    .select()
    .from(legacyUsers)
    .where(eq(legacyUsers.username, username))
    .limit(1);
  return operator ?? null;
}

/** Matches the policy number or the full name, case-insensitive, max. 50 rows. */
export async function searchPolicies(term: string) {
  const pattern = toLikePattern(term);
  return getDb()
    .select({
      policyNo: policies.policyNo,
      vorname: customers.vorname,
      nachname: customers.nachname,
      produkt: policies.produkt,
      status: policies.status,
      plz: customers.plz,
      ort: customers.ort,
    })
    .from(policies)
    .innerJoin(customers, eq(policies.customerId, customers.id))
    .where(
      or(
        ilike(policies.policyNo, pattern),
        ilike(
          sql`${customers.vorname} || ' ' || ${customers.nachname}`,
          pattern,
        ),
        ilike(
          sql`${customers.nachname} || ' ' || ${customers.vorname}`,
          pattern,
        ),
      ),
    )
    .orderBy(policies.policyNo)
    .limit(50);
}

export async function getPolicyDetail(policyNo: string) {
  const db = getDb();
  const [row] = await db
    .select({ policy: policies, customer: customers })
    .from(policies)
    .innerJoin(customers, eq(policies.customerId, customers.id))
    .where(eq(policies.policyNo, policyNo))
    .limit(1);
  if (!row) return null;

  const [mandates, changes] = await Promise.all([
    db
      .select()
      .from(sepaMandates)
      .where(eq(sepaMandates.customerId, row.customer.id))
      .orderBy(desc(sepaMandates.signedOn)),
    db
      .select()
      .from(changeLog)
      .where(eq(changeLog.policyId, row.policy.id))
      .orderBy(desc(changeLog.changedAt)),
  ]);

  return { ...row, mandates, changes };
}

export type PolicyDetail = NonNullable<
  Awaited<ReturnType<typeof getPolicyDetail>>
>;
