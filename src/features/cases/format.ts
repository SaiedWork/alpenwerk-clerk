const seconds = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Handling time for the list: `3,4 s`, `1 min 5 s`, or an en dash when unknown. */
export function formatHandlingTime(ms: number | null): string {
  if (ms === null || ms < 0) return "–";
  if (ms < 60_000) return `${seconds.format(ms / 1000)} s`;
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)} min ${total % 60} s`;
}
