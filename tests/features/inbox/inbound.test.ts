import { describe, expect, it, vi } from "vitest";
import { inboundEmailSchema } from "@/features/inbox/schemas/inbound";
import {
  handleInboundEmail,
  type InboundDeps,
} from "@/features/inbox/server/handle-inbound";
import { signBody } from "@/lib/hmac";

vi.mock("@/lib/env", () => ({ env: { INBOUND_WEBHOOK_SECRET: "s3cret" } }));
vi.mock("@/features/inbox/server/ingest", () => ({ ingestEmail: vi.fn() }));

const secret = "s3cret";
const now = new Date("2026-11-06T10:00:00Z");
const ts = String(now.getTime() / 1000);
const email = {
  from: "a@example.org",
  subject: "Adresse",
  body: "Neue Adresse",
};

function setup() {
  const ingest = vi.fn<InboundDeps["ingest"]>(async () => ({
    caseId: "case-1",
  }));
  const deps: InboundDeps = { secret, now: () => now, ingest };
  return { ingest, deps };
}

function signed(payload: unknown, headers: Record<string, string> = {}) {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  return new Request("http://localhost/api/inbound/email", {
    method: "POST",
    body: raw,
    headers: {
      "x-timestamp": ts,
      "x-signature": signBody(secret, ts, raw),
      ...headers,
    },
  });
}

async function call(request: Request, deps: InboundDeps) {
  const response = await handleInboundEmail(request, deps);
  return { status: response.status, json: await response.json() };
}

describe("inboundEmailSchema", () => {
  it("accepts empty subject and body", () => {
    expect(
      inboundEmailSchema.safeParse({
        from: "a@example.org",
        subject: "",
        body: "",
      }).success,
    ).toBe(true);
  });
  it.each([
    ["unknown key", { ...email, extra: 1 }],
    ["bad address", { ...email, from: "nobody" }],
    ["missing body", { from: email.from, subject: "s" }],
  ])("rejects %s", (_n, value) => {
    expect(inboundEmailSchema.safeParse(value).success).toBe(false);
  });
});

describe("handleInboundEmail", () => {
  it("creates a case for a correctly signed request", async () => {
    const { ingest, deps } = setup();
    expect(await call(signed(email), deps)).toEqual({
      status: 201,
      json: { caseId: "case-1" },
    });
    expect(ingest).toHaveBeenCalledWith(email);
  });

  it.each([
    [
      "no signature headers",
      new Request("http://x/", { method: "POST", body: "{}" }),
      401,
      "MISSING_SIGNATURE",
    ],
    [
      "wrong signature",
      signed(email, { "x-signature": "0".repeat(64) }),
      401,
      "BAD_SIGNATURE",
    ],
    [
      "stale timestamp",
      (() => {
        const old = String(Number(ts) - 600);
        const raw = JSON.stringify(email);
        return new Request("http://x/", {
          method: "POST",
          body: raw,
          headers: {
            "x-timestamp": old,
            "x-signature": signBody(secret, old, raw),
          },
        });
      })(),
      401,
      "STALE_TIMESTAMP",
    ],
  ])(
    "rejects %s without touching the database",
    async (_n, request, status, error) => {
      const { ingest, deps } = setup();
      expect(await call(request, deps)).toEqual({ status, json: { error } });
      expect(ingest).not.toHaveBeenCalled();
    },
  );

  it("returns 503 when no secret is configured", async () => {
    const { ingest, deps } = setup();
    const res = await call(signed(email), { ...deps, secret: undefined });
    expect(res).toEqual({ status: 503, json: { error: "NOT_CONFIGURED" } });
    expect(ingest).not.toHaveBeenCalled();
  });

  it("checks the signature before parsing: unsigned garbage gets 401, not 400", async () => {
    const { deps } = setup();
    const res = await call(
      new Request("http://x/", { method: "POST", body: "not json" }),
      deps,
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for signed invalid JSON and invalid bodies", async () => {
    const { ingest, deps } = setup();
    expect((await call(signed("not json"), deps)).json).toEqual({
      error: "INVALID_JSON",
    });
    expect((await call(signed({ ...email, from: "x" }), deps)).json).toEqual({
      error: "INVALID_BODY",
    });
    expect(ingest).not.toHaveBeenCalled();
  });

  it("returns 413 for oversize fields and oversize payloads", async () => {
    const { ingest, deps } = setup();
    expect(
      await call(signed({ ...email, body: "x".repeat(4001) }), deps),
    ).toEqual({ status: 413, json: { error: "INPUT_TOO_LONG" } });
    expect(await call(signed("x".repeat(40_000)), deps)).toEqual({
      status: 413,
      json: { error: "PAYLOAD_TOO_LARGE" },
    });
    expect(ingest).not.toHaveBeenCalled();
  });
});
