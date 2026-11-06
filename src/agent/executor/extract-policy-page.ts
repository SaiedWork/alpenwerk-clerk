import type { RawPolicyPage } from "./parse-policy";

/**
 * Runs INSIDE the browser page (passed to `page.evaluate`), so it must not reference anything
 * from outside this function. It only reads `data-testid` cells; all interpretation happens in
 * `parsePolicyPage`.
 */
export function extractPolicyPage(keys: readonly string[]): RawPolicyPage {
  const byId = (root: ParentNode, id: string) =>
    root.querySelector(`[data-testid="${id}"]`);
  const text = (root: ParentNode, id: string) =>
    byId(root, id)?.textContent?.trim() ?? null;

  const texts: Record<string, string | null> = {};
  for (const key of keys) texts[key] = text(document, key);

  const mandate = byId(document, "mandate-aktiv");
  const changes = Array.from(
    document.querySelectorAll('[data-testid="changelog-row"]'),
  ).map((row) => ({
    at: byId(row, "changelog-at")?.getAttribute("datetime") ?? null,
    field: text(row, "changelog-field"),
  }));

  return {
    texts: texts as RawPolicyPage["texts"],
    activeMandate: mandate
      ? {
          iban: text(mandate, "mandate-iban"),
          holder: text(mandate, "mandate-holder"),
        }
      : null,
    changes,
  };
}
