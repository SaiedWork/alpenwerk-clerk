import { handleCronReset } from "@/features/reset/server/handle-cron-reset";

// Vercel Cron always sends GET; never serve a cached answer.
export const dynamic = "force-dynamic";
// Truncate and reseed in one transaction; well inside the function limit.
export const maxDuration = 60;

export function GET(request: Request) {
  return handleCronReset(request);
}
