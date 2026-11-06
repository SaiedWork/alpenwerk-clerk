import type {
  CasePatch,
  PipelineCase,
  PipelineStore,
  ReplyDraft,
  StoredEvent,
} from "@/agent/pipeline/types";

/** In-memory `PipelineStore` for tests: same contract as the Drizzle store, no database. */
export function createMemoryPipelineStore(initial: PipelineCase[]) {
  const cases = new Map(
    initial.map((c) => [c.id, { ...c, patch: {} as CasePatch }]),
  );
  const events: (StoredEvent & { caseId: string })[] = [];
  const replies = new Map<
    string,
    ReplyDraft & { editedByHuman: boolean; status: "draft" | "simulated_sent" }
  >();
  let nextId = 1;

  const store: PipelineStore = {
    async getCase(id) {
      const c = cases.get(id);
      return c
        ? { id: c.id, fromEmail: c.fromEmail, subject: c.subject, body: c.body }
        : null;
    },
    async listEvents(id) {
      return events
        .filter((e) => e.caseId === id)
        .map((e) => structuredClone(e));
    },
    async startEvent(caseId, step) {
      const seq = events.filter((e) => e.caseId === caseId).length + 1;
      const event = {
        id: nextId++,
        caseId,
        seq,
        step,
        status: "started" as const,
        payload: null,
        durationMs: null,
      };
      events.push(event);
      return { eventId: event.id };
    },
    async finishEvent(eventId, result) {
      const event = events.find((e) => e.id === eventId);
      if (!event) throw new Error("unknown event");
      Object.assign(event, {
        status: result.status,
        // Like jsonb: what comes back has been through JSON.
        payload: JSON.parse(JSON.stringify(result.payload)),
        durationMs: result.durationMs,
      });
    },
    async updateCase(id, patch) {
      const c = cases.get(id);
      if (!c) throw new Error("unknown case");
      Object.assign(c.patch, patch);
    },
    async saveReply(id, reply, { sent }) {
      const existing = replies.get(id);
      if (existing && (existing.editedByHuman || existing.status !== "draft")) {
        return;
      }
      replies.set(id, {
        ...reply,
        editedByHuman: false,
        status: sent ? "simulated_sent" : "draft",
      });
    },
  };

  return {
    store,
    events: (id: string) => events.filter((e) => e.caseId === id),
    reply: (id: string) => replies.get(id),
    /** Test hook: pretend a reviewer edited the draft. */
    markReplyEdited: (id: string) => {
      const r = replies.get(id);
      if (r) r.editedByHuman = true;
    },
    caseState: (id: string) => cases.get(id)?.patch ?? {},
  };
}
