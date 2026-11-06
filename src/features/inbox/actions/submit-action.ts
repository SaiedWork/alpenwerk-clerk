"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { computeCacheKey } from "@/agent/llm/cache-key";
import { createDbStores } from "@/agent/llm/stores";
import { getDb } from "@/db/client";
import { createDbRateLimitStore } from "@/db/rate-limit-store";
import { env } from "@/lib/env";
import { clientIp, hashIp, IpHashConfigError } from "@/lib/ip-hash";
import { logger } from "@/lib/logger";
import { ingestEmail } from "../server/ingest";
import { runCase } from "../server/run-case";
import {
  submitSimulatedEmail,
  type SubmitErrorCode,
} from "../server/submit-simulated";

export type SubmitActionResult = {
  ok: false;
  error: SubmitErrorCode | "NOT_CONFIGURED" | "UNKNOWN";
  /** When the exceeded limit resets, ISO string. */
  resetAt?: string;
};

/**
 * Creates a case from the simulator form and opens it. Returns only on failure: success
 * redirects to the new case. Limits are per visitor (hashed IP, never stored raw).
 */
export async function submitEmailAction(
  input: unknown,
): Promise<SubmitActionResult> {
  let caseId: string;
  try {
    const db = getDb();
    const cache = createDbStores(db).cache;
    // Without a forwarded IP (local dev) everyone shares one bucket: the strict side.
    const clientKey = hashIp(
      clientIp(await headers()) ?? "unknown",
      env.IP_HASH_SALT,
    );
    const result = await submitSimulatedEmail(input, {
      store: createDbRateLimitStore(db),
      clientKey,
      submitPerDay: env.RATE_LIMIT_SUBMIT_PER_DAY,
      livePerHour: env.RATE_LIMIT_LIVE_PER_HOUR,
      liveEnabled: env.LLM_PROVIDER === "anthropic",
      isRecorded: async (email) =>
        (await cache.get(computeCacheKey(email.subject, email.body))) !== null,
      ingest: (email) => ingestEmail(email, "simulator", db),
      schedule: (id) => after(() => runCase(id)),
    });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        resetAt: result.resetAt?.toISOString(),
      };
    }
    caseId = result.caseId;
  } catch (error) {
    if (error instanceof IpHashConfigError) {
      logger.error("simulator disabled: IP_HASH_SALT is not set");
      return { ok: false, error: "NOT_CONFIGURED" };
    }
    logger.error({ err: error }, "simulator submit failed");
    return { ok: false, error: "UNKNOWN" };
  }
  // Outside the try block: redirect() works by throwing.
  redirect(`/faelle/${caseId}`);
}
