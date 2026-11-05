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

const MS_PER_DAY = 86_400_000;

/** Strict `YYYY-MM-DD` parser. Returns the input if it is a real calendar date, else `null`. */
export function parseIsoDate(raw: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const [year, month, day] = [match[1], match[2], match[3]].map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return real ? raw : null;
}

/** Calendar days from `fromIso` to `toIso` (negative if `toIso` is earlier). Both must be valid ISO dates. */
export function isoDaysBetween(fromIso: string, toIso: string): number {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  if (!from || !to)
    throw new RangeError(`Invalid ISO date: ${fromIso} / ${toIso}`);
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      MS_PER_DAY,
  );
}

/**
 * True if `instant` lies within the last `days` calendar days up to and including `now`
 * (Berlin calendar days). An instant in the future is never "within the last days".
 */
export function isWithinLastDays(
  instant: Date,
  now: Date,
  days: number,
): boolean {
  const age = isoDaysBetween(berlinDateIso(instant), berlinDateIso(now));
  return age >= 0 && age <= days;
}

const dateTime = new Intl.DateTimeFormat("de-DE", {
  timeZone: BERLIN,
  dateStyle: "short",
  timeStyle: "medium",
});

const dateOnly = new Intl.DateTimeFormat("de-DE", {
  timeZone: "UTC",
  dateStyle: "medium",
});

/** Instants are stored in UTC and shown in Europe/Berlin. */
export function formatDateTime(date: Date): string {
  return dateTime.format(date);
}

/** Formats a `YYYY-MM-DD` calendar date without any timezone shift. */
export function formatCalendarDate(iso: string): string {
  return dateOnly.format(new Date(`${iso}T00:00:00Z`));
}
