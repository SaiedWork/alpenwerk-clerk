// Cost figures are ESTIMATES for reporting only: the cap counts calls, not dollars, and the
// provider invoice is the source of truth. Prices change, so re-check them against the
// official Anthropic pricing page before every go-live and update this table if needed.

/** Date these prices were last checked against Anthropic's published prices. */
export const PRICES_CHECKED_ON = "2026-10-06";

/** USD per million tokens, for prompts up to 100K tokens (demo emails are far below that). */
const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

/** Estimated cost in USD, rounded to 6 decimals. Unknown models cost 0 (the row still records tokens). */
export function estimateCostUsd(
  model: string,
  tokensIn: number,
  tokensOut: number,
): number {
  // Provider-reported ids may carry a date suffix, so match on the prefix.
  const key = Object.keys(PRICE_PER_MTOK).find((id) => model.startsWith(id));
  if (!key) return 0;
  const price = PRICE_PER_MTOK[key];
  const usd = (tokensIn * price.input + tokensOut * price.output) / 1_000_000;
  return Math.round(usd * 1_000_000) / 1_000_000;
}
