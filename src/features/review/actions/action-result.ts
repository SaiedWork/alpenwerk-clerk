import { ZodError } from "zod";
import { logger } from "@/lib/logger";
import { ReviewError, type reviewErrorCodes } from "../server/errors";

type ActionErrorCode =
  (typeof reviewErrorCodes)[number] | "INVALID_INPUT" | "UNKNOWN";

export type ActionResult = { ok: true } | { ok: false; error: ActionErrorCode };

/** Runs a review action and maps its failures to a code the UI can translate. Never throws. */
export async function toActionResult(
  work: () => Promise<void>,
): Promise<ActionResult> {
  try {
    await work();
    return { ok: true };
  } catch (error) {
    if (error instanceof ReviewError) return { ok: false, error: error.code };
    if (error instanceof ZodError) return { ok: false, error: "INVALID_INPUT" };
    logger.error({ err: error }, "review action failed");
    return { ok: false, error: "UNKNOWN" };
  }
}
