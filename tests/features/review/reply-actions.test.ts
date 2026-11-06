import { describe, expect, it, vi } from "vitest";
import { ReviewError } from "@/features/review/server/errors";
import { editReply, sendReply } from "@/features/review/server/reply-actions";
import type { ReplyStore } from "@/features/review/server/reply-store";

vi.mock("@/lib/logger", () => {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { logger: log, caseLogger: () => log };
});

const ID = "7b9c2f0e-5a1d-4c3b-8e2f-1a2b3c4d5e6f";

/** In-memory `ReplyStore` with the same guards as the SQL version. */
function memoryStore(
  init: {
    caseStatus?: string;
    reply?: "draft" | "simulated_sent" | null;
  } = {},
) {
  const state = {
    caseStatus: init.caseStatus ?? "REPLY_READY",
    reply:
      init.reply === null
        ? null
        : {
            status: init.reply ?? "draft",
            subject: "s",
            body: "b",
            edited: false,
          },
  };
  const audit: string[] = [];
  const store: ReplyStore = {
    async edit(i) {
      if (!state.reply) return "no_reply";
      if (state.reply.status !== "draft") return "not_draft";
      Object.assign(state.reply, {
        subject: i.subject,
        body: i.body,
        edited: true,
      });
      audit.push("reply.edited");
      return "ok";
    },
    async send(i) {
      if (i.caseId !== ID) return "case_not_found";
      if (state.caseStatus !== "REPLY_READY") return "not_ready";
      if (!state.reply) return "no_reply";
      if (state.reply.status !== "draft") return "not_draft";
      state.reply.status = "simulated_sent";
      state.caseStatus = "DONE";
      audit.push("reply.sent_simulated");
      return "ok";
    },
  };
  return { store, state, audit };
}

const edit = {
  caseId: ID,
  subject: "Neu",
  body: "Neuer Text",
  reviewerLabel: "P",
};
const codeOf = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: unknown) => (e instanceof ReviewError ? e.code : "OTHER"),
  );

describe("editReply", () => {
  it("replaces the draft and marks it human-edited", async () => {
    const m = memoryStore();
    await editReply(edit, m.store);
    expect(m.state.reply).toMatchObject({
      subject: "Neu",
      body: "Neuer Text",
      edited: true,
      status: "draft",
    });
    expect(m.audit).toEqual(["reply.edited"]);
  });

  it("is refused after the reply was sent, and without a reply", async () => {
    const sent = memoryStore({ reply: "simulated_sent" });
    expect(await codeOf(editReply(edit, sent.store))).toBe("REPLY_NOT_DRAFT");
    expect(sent.audit).toEqual([]);
    const none = memoryStore({ reply: null });
    expect(await codeOf(editReply(edit, none.store))).toBe("REPLY_NOT_FOUND");
  });

  it.each([
    [
      "a full IBAN in the body",
      { body: "Ihre IBAN: DE89 3704 0044 0532 0130 00" },
    ],
    ["a full IBAN in the subject", { subject: "DE89370400440532013000" }],
    ["an empty body", { body: "  " }],
    ["a multi-line subject", { subject: "a\nBcc: x@y.z" }],
    ["an over-long body", { body: "x".repeat(4001) }],
    ["an unknown field", { status: "simulated_sent" }],
  ])("rejects %s", async (_name, patch) => {
    const m = memoryStore();
    await expect(editReply({ ...edit, ...patch }, m.store)).rejects.toThrow();
    expect(m.audit).toEqual([]);
  });

  it("accepts a masked IBAN", async () => {
    const m = memoryStore();
    await editReply(
      { ...edit, body: "Neue IBAN: DE89 **** **** **** **** 00" },
      m.store,
    );
    expect(m.audit).toEqual(["reply.edited"]);
  });
});

describe("sendReply", () => {
  const send = { caseId: ID, reviewerLabel: "P" };

  it("sends once: reply simulated_sent, case DONE, one audit row", async () => {
    const m = memoryStore();
    await sendReply(send, m.store);
    expect(m.state.reply?.status).toBe("simulated_sent");
    expect(m.state.caseStatus).toBe("DONE");
    expect(m.audit).toEqual(["reply.sent_simulated"]);
  });

  it("a double send fails and writes no second audit row", async () => {
    const m = memoryStore();
    await sendReply(send, m.store);
    expect(await codeOf(sendReply(send, m.store))).toBe("CASE_NOT_REPLY_READY");
    expect(m.audit).toHaveLength(1);
  });

  it("an edited draft can be sent", async () => {
    const m = memoryStore();
    await editReply(edit, m.store);
    await sendReply(send, m.store);
    expect(m.audit).toEqual(["reply.edited", "reply.sent_simulated"]);
  });

  it.each([
    [{ caseStatus: "AWAITING_REVIEW" }, "CASE_NOT_REPLY_READY"],
    [{ caseStatus: "FAILED" }, "CASE_NOT_REPLY_READY"],
    [{ reply: null }, "REPLY_NOT_FOUND"],
    [{ reply: "simulated_sent" as const }, "REPLY_NOT_DRAFT"],
  ])("refuses %j with %s", async (init, code) => {
    const m = memoryStore(init);
    expect(await codeOf(sendReply(send, m.store))).toBe(code);
    expect(m.audit).toEqual([]);
  });

  it("fails for an unknown case and for invalid input", async () => {
    const m = memoryStore();
    expect(
      await codeOf(
        sendReply(
          {
            caseId: "11111111-1111-4111-8111-111111111111",
            reviewerLabel: "P",
          },
          m.store,
        ),
      ),
    ).toBe("CASE_NOT_FOUND");
    await expect(
      sendReply({ caseId: "x", reviewerLabel: "P" }, m.store),
    ).rejects.toThrow();
  });
});
