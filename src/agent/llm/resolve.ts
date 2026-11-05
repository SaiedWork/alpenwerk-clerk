import type { LanguageModel } from "ai";
import { logger } from "@/lib/logger";
import { berlinDayStart } from "@/lib/dates";
import { computeCacheKey } from "./cache-key";
import { LlmBudgetError, LlmError, ReplayMissError } from "./errors";
import { extractFromEmail } from "./extract";
import { estimateCostUsd } from "./pricing";
import { extractionSchema, type Extraction } from "./schema";
import type { CacheStore, CallStore } from "./stores";

export interface ResolveDeps {
  cache: CacheStore;
  calls: CallStore;
  /** `null` in replay mode: only the cache can answer. */
  model: LanguageModel | null;
  /** Configured model id, recorded on failed live attempts. */
  modelName: string;
  /** `LLM_DAILY_CALL_CAP`: global circuit breaker on live calls per Berlin day. */
  dailyCap: number;
  now?: () => Date;
  extract?: typeof extractFromEmail;
}

export interface ResolveResult {
  extraction: Extraction;
  source: "cache" | "live";
  model: string;
}

/**
 * Resolution order (HANDOFF §8): cache hit, then a live call if the daily cap allows,
 * otherwise a typed failure the UI turns into a friendly German message. Cached emails
 * always work, even when the cap is reached.
 */
export async function resolveExtraction(
  input: { subject: string; body: string; caseId: string | null },
  deps: ResolveDeps,
): Promise<ResolveResult> {
  const { subject, body, caseId } = input;
  const now = deps.now ?? (() => new Date());
  const key = computeCacheKey(subject, body);

  const hit = await readCache(deps.cache, key);
  if (hit) {
    await deps.calls.insert({
      caseId,
      model: hit.model,
      tokensIn: 0,
      tokensOut: 0,
      cached: true,
      estCostUsd: 0,
    });
    logger.info({ caseId, model: hit.model, cached: true }, "llm resolved");
    return { extraction: hit.extraction, source: "cache", model: hit.model };
  }

  if (deps.model === null) throw new ReplayMissError();

  // Read-then-call is not atomic, so parallel requests can overshoot the cap by a few calls.
  // That is acceptable for a circuit breaker; it is not a billing guarantee.
  const used = await deps.calls.countLiveSince(berlinDayStart(now()));
  if (used >= deps.dailyCap) throw new LlmBudgetError(deps.dailyCap);

  const extract = deps.extract ?? extractFromEmail;
  try {
    const live = await extract({ subject, body, model: deps.model });
    const cost = estimateCostUsd(
      live.model,
      live.usage.tokensIn,
      live.usage.tokensOut,
    );
    await deps.cache.put({
      key,
      response: live.extraction,
      model: live.model,
      seeded: false,
    });
    await deps.calls.insert({
      caseId,
      model: live.model,
      tokensIn: live.usage.tokensIn,
      tokensOut: live.usage.tokensOut,
      cached: false,
      estCostUsd: cost,
    });
    logger.info(
      {
        caseId,
        model: live.model,
        cached: false,
        tokensIn: live.usage.tokensIn,
        tokensOut: live.usage.tokensOut,
        estCostUsd: cost,
      },
      "llm resolved",
    );
    return { extraction: live.extraction, source: "live", model: live.model };
  } catch (error) {
    // A failed attempt may still have reached the provider, so it counts against the cap.
    // Retry storms therefore trip the breaker. Nothing is cached.
    if (error instanceof LlmError && error.code !== "LLM_NOT_CONFIGURED") {
      await deps.calls.insert({
        caseId,
        model: deps.modelName,
        tokensIn: 0,
        tokensOut: 0,
        cached: false,
        estCostUsd: 0,
      });
    }
    throw error;
  }
}

/** A cached payload is re-validated; anything that no longer parses counts as a miss. */
async function readCache(cache: CacheStore, key: string) {
  const row = await cache.get(key);
  if (!row) return null;
  const parsed = extractionSchema.safeParse(row.response);
  if (!parsed.success) {
    logger.warn({ cacheKey: key }, "ignoring invalid llm_cache row");
    return null;
  }
  return { extraction: parsed.data, model: row.model };
}
