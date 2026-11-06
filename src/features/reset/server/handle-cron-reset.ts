import { resetDatabase, ResetConfigError } from "@/db/reset";
import { env } from "@/lib/env";
import { CronAuthError, verifyCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

export interface CronResetDeps {
  secret: string | undefined;
  reset: typeof resetDatabase;
  now: () => number;
}

const defaultDeps = (): CronResetDeps => ({
  secret: env.CRON_SECRET,
  reset: resetDatabase,
  now: () => Date.now(),
});

const fail = (status: number, error: string) =>
  Response.json({ error }, { status });

/**
 * Daily demo reset. Authenticates first; nothing runs for an unauthenticated request. The
 * reset is one transaction, so a failure leaves the previous data untouched, and a repeated
 * or duplicated cron call (Vercel delivers best effort) is harmless. Errors never echo details.
 */
export async function handleCronReset(
  request: Request,
  deps: CronResetDeps = defaultDeps(),
): Promise<Response> {
  try {
    verifyCronAuth(request.headers.get("authorization"), deps.secret);
  } catch (error) {
    if (!(error instanceof CronAuthError)) throw error;
    return fail(error.code === "NOT_CONFIGURED" ? 503 : 401, error.code);
  }

  const startedAt = deps.now();
  try {
    const summary = await deps.reset();
    const durationMs = deps.now() - startedAt;
    logger.info({ durationMs }, "cron reset finished");
    return Response.json({ ok: true, durationMs, ...summary });
  } catch (error) {
    logger.error({ err: error }, "cron reset failed");
    return error instanceof ResetConfigError
      ? fail(503, error.code)
      : fail(500, "RESET_FAILED");
  }
}
