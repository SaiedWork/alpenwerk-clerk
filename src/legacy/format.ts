// Date formatting lives in the shared lib; re-exported here for the legacy views.
export { formatCalendarDate, formatDateTime } from "@/lib/dates";

export function formatEuro(amount: string): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(amount));
}
