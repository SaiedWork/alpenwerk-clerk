import { buildCustomerFixtures } from "../../seed/customers";
import { hashPassword } from "@/lib/password";
import {
  changeLog,
  customers,
  legacyUsers,
  policies,
  sepaMandates,
} from "./schema/legacy";
import type { Tx } from "./tx";

export interface LegacyOperator {
  username: string;
  password: string;
}

export interface SeedSummary {
  customers: number;
  policies: number;
  mandates: number;
  changes: number;
}

/** Inserts the synthetic legacy data. Expects empty tables (see `resetDatabase`). */
export async function seedLegacy(
  tx: Tx,
  now: Date,
  operator: LegacyOperator,
): Promise<SeedSummary> {
  const summary: SeedSummary = {
    customers: 0,
    policies: 0,
    mandates: 0,
    changes: 0,
  };

  await tx.insert(legacyUsers).values({
    username: operator.username,
    passwordHash: await hashPassword(operator.password),
    displayName: "Digitaler Sachbearbeiter",
  });

  for (const fixture of buildCustomerFixtures(now)) {
    const [customer] = await tx
      .insert(customers)
      .values(fixture.customer)
      .returning({ id: customers.id });
    summary.customers += 1;

    const [policy] = await tx
      .insert(policies)
      .values({ ...fixture.policy, customerId: customer.id })
      .returning({ id: policies.id });
    summary.policies += 1;

    if (fixture.mandate) {
      await tx
        .insert(sepaMandates)
        .values({ ...fixture.mandate, customerId: customer.id });
      summary.mandates += 1;
    }

    for (const change of fixture.changes ?? []) {
      await tx.insert(changeLog).values({ ...change, policyId: policy.id });
      summary.changes += 1;
    }
  }

  return summary;
}
