import { describe, expect, it } from "vitest";
import {
  buildCustomerFixtures,
  daysAgo,
  isoDate,
  type CustomerFixture,
} from "../../seed/customers";

const NOW = new Date("2026-11-04T12:00:00Z");
const fixtures = buildCustomerFixtures(NOW);
const byKey = (key: string): CustomerFixture => {
  const found = fixtures.find((f) => f.key === key);
  if (!found) throw new Error(`missing fixture ${key}`);
  return found;
};

// ISO 13616 mod-97 check, only used here to prove the synthetic IBANs are well-formed.
function ibanChecksumOk(iban: string): boolean {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = [...rearranged]
    .map((c) => (/\d/.test(c) ? c : String(c.charCodeAt(0) - 55)))
    .join("");
  let rest = 0;
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1;
}

describe("legacy seed fixtures", () => {
  it("has at least 12 customers with unique policy numbers and keys", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(12);
    const policyNos = fixtures.map((f) => f.policy.policyNo);
    expect(new Set(policyNos).size).toBe(policyNos.length);
    expect(new Set(fixtures.map((f) => f.key)).size).toBe(fixtures.length);
  });

  it("uses well-formed, unique German IBANs", () => {
    const ibans = fixtures.flatMap((f) => (f.mandate ? [f.mandate.iban] : []));
    expect(new Set(ibans).size).toBe(ibans.length);
    for (const iban of ibans) {
      expect(iban).toMatch(/^DE\d{20}$/);
      expect(ibanChecksumOk(iban)).toBe(true);
    }
  });

  it("covers the special scenarios required by the rules", () => {
    expect(byKey("schneider-ruhend").policy.status).toBe("ruhend");
    expect(byKey("hoffmann-storniert").policy.status).toBe("storniert");
    expect(byKey("krause-no-mandate").mandate?.status).not.toBe("aktiv");
    expect(
      byKey("fischer-irrevocable").policy.unwiderruflicheBezugsberechtigung,
    ).toBe(true);

    const wagner = byKey("wagner-spouse-holder");
    expect(wagner.mandate?.kontoinhaber).not.toContain(wagner.customer.vorname);

    expect(byKey("lehmann-work-email").customer.email).toMatch(/lehmann-bau/);
    expect(byKey("mueller-schmidt").customer.nachname).toContain("-");
    expect(byKey("weiss").customer.nachname).toContain("ß");
  });

  it("keeps the recent address change relative to `now`", () => {
    for (const now of [NOW, new Date("2027-03-01T08:30:00Z")]) {
      const neumann = buildCustomerFixtures(now).find(
        (f) => f.key === "neumann-recent-move",
      );
      const change = neumann?.changes?.[0];
      expect(change?.field).toBe("adresse");
      expect(now.getTime() - (change?.changedAt as Date).getTime()).toBe(
        5 * 86_400_000,
      );
    }
  });

  it("shifts contract dates with `now` instead of freezing them", () => {
    const later = new Date("2030-01-01T00:00:00Z");
    const before = byKey("mueller-schmidt").policy.beginn;
    const after = buildCustomerFixtures(later).find(
      (f) => f.key === "mueller-schmidt",
    )?.policy.beginn;
    expect(after).not.toBe(before);
    expect(new Date(after as string).getTime()).toBeGreaterThan(
      new Date(before as string).getTime(),
    );
  });

  it("daysAgo and isoDate work in UTC", () => {
    expect(isoDate(daysAgo(NOW, 5))).toBe("2026-10-30");
  });
});
