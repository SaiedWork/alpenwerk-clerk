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

const MONTHS: Record<string, number> = {
  januar: 1,
  jan: 1,
  jänner: 1,
  january: 1,
  februar: 2,
  feb: 2,
  february: 2,
  märz: 3,
  maerz: 3,
  mär: 3,
  mrz: 3,
  mar: 3,
  march: 3,
  april: 4,
  apr: 4,
  mai: 5,
  may: 5,
  juni: 6,
  jun: 6,
  june: 6,
  juli: 7,
  jul: 7,
  july: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  okt: 10,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  dezember: 12,
  dez: 12,
  december: 12,
  dec: 12,
};

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** Two-digit years: up to the current year means 20yy, otherwise 19yy (`85` -> 1985, `05` -> 2005). */
function expandYear(raw: string, now: Date): number {
  if (raw.length === 4) return Number(raw);
  const current = now.getUTCFullYear();
  const candidate = 2000 + Number(raw);
  return candidate <= current ? candidate : candidate - 100;
}

/**
 * Defensive date parser for dates copied from emails. Day-first order is mandatory, as in German
 * usage: `12.04.1985`, `12.4.85`, `12/04/1985`, `12-04-1985`, `12. April 1985`, `12 Apr. 1985`,
 * plus ISO `1985-04-12`. Month > 12 is never swapped (no US order). Returns `YYYY-MM-DD` for a real
 * calendar date, else `null`. `now` only resolves two-digit years.
 */
export function parseFlexibleDate(raw: string, now: Date): string | null {
  const text = raw
    .trim()
    .toLowerCase()
    .replace(/^(am|den|vom|zum|ab|per)\s+/, "")
    .replace(/\s+/g, " ");

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (iso) {
    return parseIsoDate(
      `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`,
    );
  }

  const numeric = /^(\d{1,2}) ?[./-] ?(\d{1,2}) ?[./-] ?(\d{4}|\d{2})$/.exec(
    text,
  );
  if (numeric) {
    const year = expandYear(numeric[3], now);
    return parseIsoDate(
      `${pad(year, 4)}-${pad(Number(numeric[2]))}-${pad(Number(numeric[1]))}`,
    );
  }

  const written = /^(\d{1,2})\.? ?([a-zäöü]+)\.?,? ?(\d{4}|\d{2})$/.exec(text);
  if (written) {
    const month = MONTHS[written[2]];
    if (!month) return null;
    const year = expandYear(written[3], now);
    return parseIsoDate(
      `${pad(year, 4)}-${pad(month)}-${pad(Number(written[1]))}`,
    );
  }
  return null;
}

/** Start (00:00 Berlin) of the Berlin calendar day containing `instant`, as a UTC instant. */
export function berlinDayStart(instant: Date): Date {
  const iso = berlinDateIso(instant);
  const [year, month, day] = iso.split("-").map(Number);
  const utcMidnight = Date.UTC(year, month - 1, day);
  // Berlin is UTC+1 or UTC+2; DST switches at night, never at midnight, so one of the two fits.
  for (const offsetHours of [1, 2]) {
    const candidate = new Date(utcMidnight - offsetHours * 3_600_000);
    const previous = new Date(candidate.getTime() - 1);
    if (berlinDateIso(candidate) === iso && berlinDateIso(previous) !== iso) {
      return candidate;
    }
  }
  throw new RangeError(`Cannot determine Berlin day start for ${iso}`);
}
