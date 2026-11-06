import { expect, test, type Page } from "@playwright/test";

const POLICY_NO = "AW-100102";
const NEW_IBAN = "DE89370400440532013000";

/** Reads the active mandate IBAN through the legacy UI, like any external user would. */
async function readLegacyIban(page: Page): Promise<string> {
  await page.goto("/legacy/login");
  await page.getByTestId("login-username").fill(process.env.LEGACY_USER ?? "");
  await page
    .getByTestId("login-password")
    .fill(process.env.LEGACY_PASSWORD ?? "");
  await page.getByTestId("login-submit").click();
  // The login is a form post; navigating away before it lands would drop the session.
  await page.waitForURL("**/legacy/suche");
  await page.goto(`/legacy/police/${POLICY_NO}`);
  const iban = await page
    .getByTestId("mandate-aktiv")
    .getByTestId("mandate-iban")
    .innerText();
  return iban.replace(/\s/g, "");
}

test("B01: a clean bank change runs end to end and is verified", async ({
  page,
  browser,
  baseURL,
}) => {
  // Legacy state before and after is read in its own context (own login session).
  const legacy = await browser.newContext({ baseURL });
  const legacyPage = await legacy.newPage();
  const ibanBefore = await readLegacyIban(legacyPage);
  expect(ibanBefore).not.toBe("");
  expect(ibanBefore).not.toBe(NEW_IBAN);

  // Send the recorded sample from the simulator.
  await page.goto("/posteingang");
  await page.getByRole("combobox").click();
  await page
    .getByRole("option", { name: "Bankverbindung ändern (formell)" })
    .click();
  await page.getByRole("button", { name: "An den Clerk senden" }).click();
  await page.waitForURL(/\/faelle\/[0-9a-f-]{36}$/);
  const caseId = page.url().split("/").pop() as string;

  // The pipeline finishes on its own; the page polls.
  await expect(page.getByTestId("case-status")).toHaveText("Erledigt", {
    timeout: 90_000,
  });

  const steps = page.getByTestId("timeline-step");
  await expect(steps).toHaveCount(6);
  for (const title of [
    "E-Mail analysieren",
    "Police identifizieren",
    "Regeln prüfen",
    "Änderung ausführen",
    "Ergebnis verifizieren",
    "Antwort erstellen",
  ]) {
    const step = steps.filter({ hasText: title });
    await expect(step).toHaveCount(1);
    await expect(step).toContainText("Erledigt");
  }
  await expect(
    page.getByText("Automatisch", { exact: true }).first(),
  ).toBeVisible();

  // Screenshots from the browser steps are served as JPEG.
  const shots = page.locator('img[src^="/api/screenshots/"]');
  expect(await shots.count()).toBeGreaterThanOrEqual(5);
  const srcs = await shots.evaluateAll((els) =>
    els.map((el) => el.getAttribute("src") ?? ""),
  );
  for (const src of srcs) {
    const res = await page.request.get(src);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/jpeg");
  }

  // The reply masks the IBAN.
  const reply = await page.getByTestId("reply-body").innerText();
  expect(reply).toMatch(/DE89 \*{4} \*{4} \*{4} \*{4} 00/);
  expect(reply).not.toContain("3704");

  // The audit trail has the received mail and the simulated send.
  await page.goto(`/audit?case=${caseId}`);
  await expect(page.getByText("E-Mail eingegangen")).toBeVisible();
  await expect(page.getByText("Antwort gesendet (simuliert)")).toBeVisible();

  // The legacy record really changed.
  expect(await readLegacyIban(legacyPage)).toBe(NEW_IBAN);
  await legacy.close();
});
