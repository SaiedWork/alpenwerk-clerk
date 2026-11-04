const dateTime = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
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

export function formatEuro(amount: string): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(amount));
}
