// Dates are stored in UTC and displayed in Europe/Berlin. Pure helpers, no hidden clock access.

const BERLIN = "Europe/Berlin";

const berlinParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: BERLIN,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar date of an instant as seen in Berlin, as `YYYY-MM-DD`. */
export function berlinDateIso(instant: Date): string {
  const part = (type: string) =>
    berlinParts.formatToParts(instant).find((p) => p.type === type)?.value ??
    "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Last calendar day of the month the instant falls in (Berlin time), as `YYYY-MM-DD`. */
export function endOfMonthBerlinIso(instant: Date): string {
  const [year, month] = berlinDateIso(instant).split("-").map(Number);
  // Day 0 of the next month is the last day of this month.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}
