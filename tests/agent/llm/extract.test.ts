import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { LlmError } from "@/agent/llm/errors";
import { extractFromEmail } from "@/agent/llm/extract";
import { LlmInputError, MAX_BODY_CHARS } from "@/agent/llm/limits";
import { SYSTEM_PROMPT } from "@/agent/llm/prompt";

const wireBase = {
  intents: ["bank_change"],
  primary_intent: "bank_change",
  confidence: 0.93,
  language: "de",
  policy_no: "AW-100101",
  sender_name: "Anna Müller-Schmidt",
  date_of_birth: null,
  strasse: null,
  hausnr: null,
  plz: null,
  ort: null,
  land: null,
  iban: "DE89 3704 0044 0532 0130 00",
  account_holder: "Anna Müller-Schmidt",
  effective_date: null,
  requested_termination_date: null,
  reason: null,
  summary: null,
};

function mockModel(output: unknown, usage = { input: 120, output: 45 }) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [
        {
          type: "text",
          text: typeof output === "string" ? output : JSON.stringify(output),
        },
      ],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: {
          total: usage.input,
          noCache: usage.input,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: {
          total: usage.output,
          text: usage.output,
          reasoning: undefined,
        },
      },
      warnings: [],
    }),
  });
}

const call = (model: MockLanguageModelV4, extra = {}) =>
  extractFromEmail({
    subject: "IBAN ändern",
    body: "Neue IBAN bitte.",
    model,
    ...extra,
  });

describe("extractFromEmail", () => {
  it("returns a validated extraction with usage", async () => {
    const result = await call(mockModel(wireBase));
    expect(result.extraction).toMatchObject({
      primary_intent: "bank_change",
      iban: "DE89 3704 0044 0532 0130 00",
      account_holder: "Anna Müller-Schmidt",
    });
    expect(result.usage).toEqual({ tokensIn: 120, tokensOut: 45 });
  });

  it("drops fields of other intents and keeps the primary one", async () => {
    const result = await call(
      mockModel({
        ...wireBase,
        intents: ["bank_change", "address_change"],
        strasse: "Hauptstraße",
        hausnr: "5",
      }),
    );
    expect(result.extraction).not.toHaveProperty("strasse");
    expect(result.extraction.intents).toEqual([
      "bank_change",
      "address_change",
    ]);
  });

  it("sends the system prompt and a delimited message, nothing else about the sender", async () => {
    const model = mockModel(wireBase);
    await call(model);
    const sent = model.doGenerateCalls[0];
    expect(JSON.stringify(sent.prompt)).toContain(SYSTEM_PROMPT.slice(0, 40));
    expect(JSON.stringify(sent.prompt)).toContain("<<<EMAIL_START>>>");
    expect(JSON.stringify(sent.prompt)).toContain("Neue IBAN bitte.");
  });

  it("rejects non-JSON output as LLM_OUTPUT_INVALID", async () => {
    await expect(call(mockModel("Gern geschehen!"))).rejects.toMatchObject({
      name: "LlmError",
      code: "LLM_OUTPUT_INVALID",
    });
  });

  it("rejects output that violates the wire schema", async () => {
    await expect(
      call(mockModel({ ...wireBase, primary_intent: "refund" })),
    ).rejects.toMatchObject({ code: "LLM_OUTPUT_INVALID" });
  });

  it("rejects output the strict union refuses (confidence out of range)", async () => {
    const error = await call(mockModel({ ...wireBase, confidence: 1.7 })).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(LlmError);
    expect(error).toMatchObject({ code: "LLM_OUTPUT_INVALID" });
    expect((error as LlmError).details).toBeInstanceOf(Array);
  });

  it("maps provider failures to LLM_PROVIDER_ERROR and keeps the cause", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("503 overloaded");
      },
    });
    const error = await call(model).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: "LLM_PROVIDER_ERROR" });
    expect(String((error as LlmError).cause)).toContain("503");
  });

  it("maps a slow call to LLM_TIMEOUT", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: ({ abortSignal }) =>
        new Promise((_resolve, reject) => {
          abortSignal?.addEventListener("abort", () =>
            reject(abortSignal.reason),
          );
        }),
    });
    await expect(call(model, { timeoutMs: 20 })).rejects.toMatchObject({
      code: "LLM_TIMEOUT",
    });
  });

  it("rejects oversize input before calling the model", async () => {
    const model = mockModel(wireBase);
    await expect(
      extractFromEmail({
        subject: "x",
        body: "b".repeat(MAX_BODY_CHARS + 1),
        model,
      }),
    ).rejects.toBeInstanceOf(LlmInputError);
    expect(model.doGenerateCalls).toHaveLength(0);
  });
});
