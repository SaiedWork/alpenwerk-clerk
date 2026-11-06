import type { Browser } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { PlaywrightLegacyDriver } from "@/agent/executor/playwright-driver";
import type { RawPolicyPage } from "@/agent/executor/parse-policy";

const RAW: RawPolicyPage = {
  texts: {
    "customer-name": "Herr Max Mustermann",
    "customer-birthdate": "01.02.1980",
    "customer-email": "max@example.test",
    "policy-no": "AW-1",
    "policy-status": "aktiv",
    "policy-surrender-value": "0,00 €",
    "policy-irrevocable": "nein",
  },
  activeMandate: null,
  changes: [],
};

/** Minimal stand-in for a Playwright page: `present` lists the test ids currently on screen. */
function fakeBrowser(present: Set<string>, onClick?: () => void) {
  const closed = vi.fn(async () => {});
  const locator = (id: string) => ({
    count: async () => (present.has(id) ? 1 : 0),
    fill: async () => {},
    click: async () => onClick?.(),
    waitFor: async () => {},
    or() {
      return this;
    },
  });
  const page = {
    goto: vi.fn(async () => {}),
    getByTestId: locator,
    evaluate: vi.fn(async () => RAW),
    screenshot: vi.fn(async () => Buffer.from("jpeg")),
    url: () => "http://x/legacy/police/AW-1",
  };
  const browser = {
    newContext: async () => ({
      setDefaultTimeout: () => {},
      newPage: async () => page,
    }),
    close: closed,
  } as unknown as Browser;
  return { browser, page, closed };
}

function setup(present: string[], user: string | null = "op") {
  const fake = fakeBrowser(new Set(present));
  const save = vi.fn(async () => {});
  const launch = vi.fn(async () => fake.browser);
  const driver = new PlaywrightLegacyDriver({
    baseUrl: "http://x/legacy/",
    user: user ?? undefined,
    password: user ? "pw" : undefined,
    caseId: "c1",
    sink: { save },
    launch,
  });
  return { ...fake, save, launch, driver };
}

describe("PlaywrightLegacyDriver", () => {
  it("reads a policy and stores one screenshot", async () => {
    const { driver, save, page } = setup(["policy-overview"]);
    const snapshot = await driver.readPolicy("AW-1");
    expect(snapshot?.policyNo).toBe("AW-1");
    expect(page.goto).toHaveBeenLastCalledWith("http://x/legacy/police/AW-1");
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "c1",
        caption: "Police gefunden",
      }),
    );
  });

  it("returns null and screenshots for an unknown policy", async () => {
    const { driver, save } = setup(["policy-not-found"]);
    expect(await driver.readPolicy("AW-0")).toBeNull();
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ caption: "Police nicht gefunden" }),
    );
  });

  it("logs in once for several reads", async () => {
    const { driver, launch } = setup(["policy-overview"]);
    await driver.readPolicy("AW-1");
    await driver.readPolicy("AW-1");
    expect(launch).toHaveBeenCalledOnce();
  });

  it("fails on an unexpected page", async () => {
    const { driver } = setup([]);
    await expect(driver.readPolicy("AW-1")).rejects.toMatchObject({
      code: "LEGACY_UNEXPECTED_PAGE",
    });
  });

  it("fails without credentials and never starts a browser", async () => {
    const { driver, launch } = setup(["policy-overview"], null);
    await expect(driver.readPolicy("AW-1")).rejects.toMatchObject({
      code: "LEGACY_NOT_CONFIGURED",
    });
    expect(launch).not.toHaveBeenCalled();
  });

  it("reports a rejected login and closes the browser", async () => {
    const { driver, closed } = setup(["login-error"]);
    await expect(driver.readPolicy("AW-1")).rejects.toMatchObject({
      code: "LEGACY_LOGIN_FAILED",
    });
    expect(closed).toHaveBeenCalledOnce();
  });

  it("closes the browser once, and close is safe to repeat", async () => {
    const { driver, closed } = setup(["policy-overview"]);
    await driver.readPolicy("AW-1");
    await driver.close();
    await driver.close();
    expect(closed).toHaveBeenCalledOnce();
  });

  it("close is safe when nothing was opened", async () => {
    const { driver } = setup([]);
    await expect(driver.close()).resolves.toBeUndefined();
  });
});
