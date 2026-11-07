import { hitRateLimit, type RateLimitStore } from "@/lib/rate-limit";
import {
  simulatorEmailSchema,
  type SimulatorEmail,
} from "../schemas/simulator";

export type SubmitErrorCode =
  "INVALID_INPUT" | "RATE_LIMIT_DAILY" | "RATE_LIMIT_LIVE" | "LIVE_DISABLED";

export type SubmitResult =
  | { ok: true; caseId: string }
  | { ok: false; error: SubmitErrorCode; resetAt?: Date };

export interface SubmitDeps {
  store: RateLimitStore;
  /** Salted hash of the visitor's IP, never the IP itself. */
  clientKey: string;
  /** `RATE_LIMIT_SUBMIT_PER_DAY`: all submissions of one visitor. */
  submitPerDay: number;
  /** `RATE_LIMIT_LIVE_PER_HOUR`: submissions that need a live model call. */
  livePerHour: number;
  /** `LLM_PROVIDER=anthropic`. Without it only recorded answers can be used. */
  liveEnabled: boolean;
  /** Does a recorded answer exist for this exact (normalized) text? */
  isRecorded: (email: SimulatorEmail) => Promise<boolean>;
  ingest: (email: SimulatorEmail) => Promise<{ caseId: string }>;
  /** Starts the pipeline after the response is sent. Must not throw. */
  schedule: (caseId: string) => void;
  now?: () => Date;
}

/**
 * Validates, applies both per-visitor limits and creates the case. Every submission counts
 * against the daily limit; only a text without a recorded answer (which costs a live model
 * call) also counts against the hourly one. Recorded sample emails therefore stay usable.
 */
export async function submitSimulatedEmail(
  input: unknown,
  deps: SubmitDeps,
): Promise<SubmitResult> {
  const parsed = simulatorEmailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const email = parsed.data;
  const now = (deps.now ?? (() => new Date()))();

  const daily = await hitRateLimit({
    store: deps.store,
    key: `submit:${deps.clientKey}`,
    limit: deps.submitPerDay,
    windowSeconds: 24 * 3600,
    now,
  });
  if (!daily.allowed) {
    return { ok: false, error: "RATE_LIMIT_DAILY", resetAt: daily.resetAt };
  }

  if (!(await deps.isRecorded(email))) {
    if (!deps.liveEnabled) return { ok: false, error: "LIVE_DISABLED" };
    const live = await hitRateLimit({
      store: deps.store,
      key: `live:${deps.clientKey}`,
      limit: deps.livePerHour,
      windowSeconds: 3600,
      now,
    });
    if (!live.allowed) {
      return { ok: false, error: "RATE_LIMIT_LIVE", resetAt: live.resetAt };
    }
  }

  const { caseId } = await deps.ingest(email);
  deps.schedule(caseId);
  return { ok: true, caseId };
}
