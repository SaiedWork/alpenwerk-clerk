import pino from "pino";
import { env } from "@/lib/env";

export const logger = pino({ level: env.LOG_LEVEL });

/** Child logger that puts `caseId` (and optionally `step`) on every line. */
export function caseLogger(caseId: string, step?: string) {
  return logger.child(step ? { caseId, step } : { caseId });
}
