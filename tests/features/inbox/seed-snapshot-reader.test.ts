import { describe, expect, it } from "vitest";
import { createSeedSnapshotReader } from "@/features/inbox/server/seed-snapshot-reader";
import { buildCustomerFixtures } from "../../../seed/customers";

const now = new Date("2026-11-06T10:00:00Z");

describe("createSeedSnapshotReader", () => {
  const reader = createSeedSnapshotReader(() => now);

  it("returns the snapshot of a seeded policy", async () => {
    const fixture = buildCustomerFixtures(now)[0];
    const snapshot = await reader.readPolicy(fixture.policy.policyNo);
    expect(snapshot).toMatchObject({
      policyNo: fixture.policy.policyNo,
      lastName: fixture.customer.nachname,
    });
  });

  it("returns null for an unknown policy", async () => {
    expect(await reader.readPolicy("XX-000")).toBeNull();
  });
});
