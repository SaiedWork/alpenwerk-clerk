import { caseLogger } from "@/lib/logger";
import { analyze } from "@/agent/steps/analyze";
import { evaluate } from "@/agent/steps/evaluate";
import { execute } from "@/agent/steps/execute";
import { identify } from "@/agent/steps/identify";
import { describeFailure } from "./failure";
import { stateFromEvents } from "./state";
import {
  STEP_NAMES,
  type PipelineDeps,
  type Step,
  type StepName,
  type StoredEvent,
} from "./types";

const STEPS: Record<StepName, Step> = { analyze, identify, evaluate, execute };

export type RunOutcome =
  | { outcome: "completed" }
  | { outcome: "already_done" }
  | { outcome: "awaiting_review" }
  | { outcome: "failed"; step: string; code: string }
  | { outcome: "not_found" };

const isDone = (e: StoredEvent) =>
  e.status === "succeeded" || e.status === "skipped";

/**
 * Runs steps 1-4 (analyze, identify, evaluate, execute) for one case and resumes where it left off.
 * A `NEEDS_REVIEW` case stops after evaluate (`awaiting_review`) unless `deps.approved` is set.
 *
 * What is done is read from the event rows, so calling this again is safe: finished steps are
 * not repeated, a failed step is retried, a `started` row left by a dead invocation is ignored.
 * Per step the case row is updated BEFORE the event is closed as succeeded: a crash in between
 * leaves a `started` event, and the idempotent step simply runs again.
 * Concurrent runs for one case are not supported; the unique (case, seq) index makes the
 * loser fail instead of corrupting the timeline.
 */
export async function runPipeline(
  caseId: string,
  deps: PipelineDeps,
): Promise<RunOutcome> {
  const { store } = deps;
  const now = deps.now ?? (() => new Date());
  const log = caseLogger(caseId);

  const caseRow = await store.getCase(caseId);
  if (!caseRow) return { outcome: "not_found" };

  const events = await store.listEvents(caseId);
  const doneByStep = new Map<string, StoredEvent>();
  for (const e of events) if (isDone(e)) doneByStep.set(e.step, e);
  if (STEP_NAMES.every((s) => doneByStep.has(s))) {
    return { outcome: "already_done" };
  }

  let handlingMs = [...doneByStep.values()].reduce(
    (sum, e) => sum + (e.durationMs ?? 0),
    0,
  );

  for (const name of STEP_NAMES) {
    if (doneByStep.has(name)) continue;
    // Review gate: only a human approval lets a flagged case reach the executor.
    if (
      name === "execute" &&
      doneByStep.get("evaluate") &&
      stateFromEvents([...doneByStep.values()]).evaluation?.decision ===
        "NEEDS_REVIEW" &&
      !deps.approved
    ) {
      log.info("waiting for human review");
      return { outcome: "awaiting_review" };
    }
    const stepLog = caseLogger(caseId, name);
    const started = Date.now();
    const { eventId } = await store.startEvent(caseId, name);

    try {
      // Rebuilt per step: the previous step's event is in `doneByStep` by now.
      const state = stateFromEvents([...doneByStep.values()]);
      const result = await STEPS[name]({
        case: caseRow,
        state,
        deps,
        now: now(),
      });
      const durationMs = Date.now() - started;
      handlingMs += durationMs;

      await store.updateCase(caseId, {
        ...result.casePatch,
        handlingMs,
        error: null,
      });
      await store.finishEvent(eventId, {
        status: result.status,
        payload: result.payload,
        durationMs,
      });
      doneByStep.set(name, {
        id: eventId,
        seq: 0,
        step: name,
        status: result.status,
        payload: JSON.parse(JSON.stringify(result.payload)),
        durationMs,
      });
      stepLog.info({ durationMs, status: result.status }, "step done");
    } catch (error) {
      const durationMs = Date.now() - started;
      const failure = describeFailure(error);
      stepLog.error({ err: error, ...failure, durationMs }, "step failed");
      await store.finishEvent(eventId, {
        status: "failed",
        payload: failure,
        durationMs,
      });
      await store.updateCase(caseId, {
        status: "FAILED",
        error: { ...failure, step: name },
      });
      return { outcome: "failed", step: name, code: failure.code };
    }
  }

  log.info({ handlingMs }, "pipeline steps completed");
  return { outcome: "completed" };
}
