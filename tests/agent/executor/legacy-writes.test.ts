import type { Browser } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { PlaywrightLegacyDriver } from "@/agent/executor/playwright-driver";

/**
 * A tiny stand-in for the legacy site behind a Playwright page. It knows the edit forms and
 * confirmation pages by test id and applies the submitted values like the real app does.
 */
function fakeLegacy(
  options: {
    missing?: boolean;
    noMandate?: boolean;
    rejectForm?: boolean;
    confirmAs?: Record<string, string>;
  } = {},
) {
  const stored: Record<string, string> = {
    strasse: "Hauptstraße",
    hausnr: "12",
    plz: "50667",
    ort: "Köln",
    land: "Deutschland",
    iban: "DE89 3704 0044 0532 0130 00",
    kontoinhaber: "Anna Müller",
  };
  const form: Record<string, string> = {};
  const clicks: string[] = [];
  let view = "login";
  let kind: "adresse" | "bank" = "adresse";
  let status = "changed";

  const confirmIds: Record<string, string> = {
    "confirm-strasse": "strasse",
    "confirm-hausnr": "hausnr",
    "confirm-plz": "plz",
    "confirm-ort": "ort",
    "confirm-land": "land",
    "confirm-iban": "iban",
    "confirm-kontoinhaber": "kontoinhaber",
  };

  const present = (id: string): boolean => {
    if (view === "login")
      return id === "login-error"
        ? false
        : id === "nav-search" || id.startsWith("login-");
    if (view === "form") {
      if (options.missing) return id === "policy-not-found";
      if (options.noMandate && kind === "bank") return id === "no-mandate";
      return kind === "adresse"
        ? [
            "input-strasse",
            "input-hausnr",
            "input-plz",
            "input-ort",
            "input-land",
            "submit-address",
          ].includes(id)
        : ["input-iban", "input-kontoinhaber", "submit-bank"].includes(id);
    }
    if (view === "result") {
      return options.rejectForm
        ? id === "form-error"
        : id === "confirmation" ||
            id === "confirmation-status" ||
            id in confirmIds;
    }
    return false;
  };

  const locator = (id: string) => {
    const self = {
      count: async () => (present(id) ? 1 : 0),
      waitFor: async () => {},
      or: () => self,
      fill: async (value: string) => {
        if (id.startsWith("input-")) form[id.slice(6)] = value;
      },
      inputValue: async () => form[id.slice(6)] ?? stored[id.slice(6)],
      click: async () => {
        clicks.push(id);
        if (id === "login-submit") view = "after-login";
        if (id.startsWith("submit-")) {
          view = "result";
          if (options.rejectForm) return;
          const before = JSON.stringify(stored);
          Object.assign(stored, form);
          status = JSON.stringify(stored) === before ? "unchanged" : "changed";
        }
      },
      textContent: async () =>
        options.confirmAs?.[id] ?? stored[confirmIds[id]],
      getAttribute: async () => status,
    };
    return self;
  };

  const page = {
    goto: vi.fn(async (url: string) => {
      if (url.endsWith("/login")) view = "login";
      else if (url.endsWith("/adresse") || url.endsWith("/bank")) {
        view = "form";
        kind = url.endsWith("/bank") ? "bank" : "adresse";
        for (const key of Object.keys(form)) delete form[key];
      }
    }),
    getByTestId: locator,
    screenshot: vi.fn(async () => Buffer.from("jpeg")),
    url: () => "http://x/legacy/x",
  };
  const browser = {
    newContext: async () => ({
      setDefaultTimeout: () => {},
      newPage: async () => page,
    }),
    close: async () => {},
  } as unknown as Browser;
  return { browser, stored, clicks };
}

function setup(options?: Parameters<typeof fakeLegacy>[0]) {
  const legacy = fakeLegacy(options);
  const save = vi.fn<
    (shot: { caption: string; step: string }) => Promise<void>
  >(async () => {});
  const driver = new PlaywrightLegacyDriver({
    baseUrl: "http://x/legacy",
    user: "op",
    password: "pw",
    caseId: "c1",
    sink: { save },
    launch: async () => legacy.browser,
  });
  const captions = () => save.mock.calls.map(([shot]) => shot.caption);
  const steps = () => save.mock.calls.map(([shot]) => shot.step);
  return { ...legacy, driver, captions, steps };
}

const newAddress = {
  street: "Ringstraße",
  houseNo: "5",
  plz: "10115",
  city: "Berlin",
  country: null,
};

describe("updateAddress", () => {
  it("writes a new address with three screenshots filed under execute", async () => {
    const { driver, stored, clicks, captions, steps } = setup();
    expect(await driver.updateAddress("AW-1", newAddress)).toBe("changed");
    expect(stored).toMatchObject({
      strasse: "Ringstraße",
      hausnr: "5",
      plz: "10115",
      ort: "Berlin",
      land: "Deutschland",
    });
    expect(clicks).toContain("submit-address");
    expect(captions()).toEqual([
      "Adresse vor Änderung",
      "Formular ausgefüllt",
      "Bestätigung",
    ]);
    expect(new Set(steps())).toEqual(new Set(["execute"]));
  });

  it("skips the submit when the system already holds the address", async () => {
    const { driver, clicks, captions } = setup();
    const same = {
      street: "hauptstraße",
      houseNo: "12",
      plz: "50667",
      city: "Köln",
      country: null,
    };
    expect(await driver.updateAddress("AW-1", same)).toBe("unchanged");
    expect(clicks).not.toContain("submit-address");
    expect(captions()).toEqual(["Adresse vor Änderung"]);
  });

  it("is idempotent: a second identical call does not submit again", async () => {
    const { driver, clicks } = setup();
    await driver.updateAddress("AW-1", newAddress);
    expect(await driver.updateAddress("AW-1", newAddress)).toBe("unchanged");
    expect(clicks.filter((c) => c === "submit-address")).toHaveLength(1);
  });

  it("returns policy_not_found without submitting", async () => {
    const { driver, clicks } = setup({ missing: true });
    expect(await driver.updateAddress("AW-0", newAddress)).toBe(
      "policy_not_found",
    );
    expect(clicks).not.toContain("submit-address");
  });

  it("throws LEGACY_FORM_REJECTED when the system shows a form error", async () => {
    const { driver } = setup({ rejectForm: true });
    await expect(
      driver.updateAddress("AW-1", newAddress),
    ).rejects.toMatchObject({ code: "LEGACY_FORM_REJECTED" });
  });

  it("throws LEGACY_CONFIRMATION_MISMATCH when the confirmation differs", async () => {
    const { driver } = setup({ confirmAs: { "confirm-plz": "99999" } });
    await expect(
      driver.updateAddress("AW-1", newAddress),
    ).rejects.toMatchObject({ code: "LEGACY_CONFIRMATION_MISMATCH" });
  });
});

describe("updateBank", () => {
  it("writes a new IBAN and holder", async () => {
    const { driver, stored, captions } = setup();
    const outcome = await driver.updateBank("AW-1", {
      iban: "DE02120300000000202051",
      holder: "Max Becker",
    });
    expect(outcome).toBe("changed");
    expect(stored).toMatchObject({
      iban: "DE02120300000000202051",
      kontoinhaber: "Max Becker",
    });
    expect(captions()).toEqual([
      "Bankverbindung vor Änderung",
      "Formular ausgefüllt",
      "Bestätigung",
    ]);
  });

  it("leaves the holder untouched when the target has none", async () => {
    const { driver, stored } = setup();
    await driver.updateBank("AW-1", {
      iban: "DE02120300000000202051",
      holder: null,
    });
    expect(stored.kontoinhaber).toBe("Anna Müller");
  });

  it("skips when the IBAN matches ignoring spaces", async () => {
    const { driver, clicks } = setup();
    expect(
      await driver.updateBank("AW-1", {
        iban: "DE89370400440532013000",
        holder: null,
      }),
    ).toBe("unchanged");
    expect(clicks).not.toContain("submit-bank");
  });

  it("returns no_mandate and policy_not_found without submitting", async () => {
    const noMandate = setup({ noMandate: true });
    expect(
      await noMandate.driver.updateBank("AW-1", {
        iban: "DE02120300000000202051",
        holder: null,
      }),
    ).toBe("no_mandate");
    const missing = setup({ missing: true });
    expect(
      await missing.driver.updateBank("AW-0", {
        iban: "DE02120300000000202051",
        holder: null,
      }),
    ).toBe("policy_not_found");
    expect(noMandate.clicks).not.toContain("submit-bank");
  });

  it("throws LEGACY_CONFIRMATION_MISMATCH when the IBAN differs on the confirmation", async () => {
    const { driver } = setup({
      confirmAs: { "confirm-iban": "DE00000000000000000000" },
    });
    await expect(
      driver.updateBank("AW-1", {
        iban: "DE02120300000000202051",
        holder: null,
      }),
    ).rejects.toMatchObject({ code: "LEGACY_CONFIRMATION_MISMATCH" });
  });
});

describe("readAddress and readBank", () => {
  it("return the current form values, normalized", async () => {
    const { driver } = setup();
    expect(await driver.readAddress("AW-1")).toEqual({
      street: "Hauptstraße",
      houseNo: "12",
      plz: "50667",
      city: "Köln",
      country: "Deutschland",
    });
    expect(await driver.readBank("AW-1")).toEqual({
      iban: "DE89370400440532013000",
      holder: "Anna Müller",
    });
  });

  it("return null for an unknown policy or a missing mandate", async () => {
    expect(
      await setup({ missing: true }).driver.readAddress("AW-0"),
    ).toBeNull();
    expect(await setup({ noMandate: true }).driver.readBank("AW-1")).toBeNull();
  });
});
