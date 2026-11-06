import { after } from "next/server";
import { getDb } from "@/db/client";
import { createDbRateLimitStore } from "@/db/rate-limit-store";
import { env } from "@/lib/env";
import {
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  verifySignature,
  WebhookAuthError,
} from "@/lib/hmac";
import { claimOnce, releaseClaim } from "@/lib/rate-limit";
import { inboundEmailSchema, type InboundEmail } from "../schemas/inbound";
import { ingestEmail } from "./ingest";
import { runCase } from "./run-case";

/** Generous upper bound for a valid request (4000 + 200 chars, JSON escaping, headroom). */
const MAX_RAW_BYTES = 32_768;

export interface InboundDeps {
  secret: string | undefined;
  now: () => Date;
  ingest: (email: InboundEmail) => Promise<{ caseId: string }>;
  /** `true` for the first request with this signature, `false` for a replay. */
  claimSignature: (signature: string) => Promise<boolean>;
  releaseSignature: (signature: string) => Promise<void>;
  /** Starts the pipeline after the response is sent. Must not throw. */
  schedule: (caseId: string) => void;
}

// Hex is case-insensitive, so the key is lowercased: an upper-case copy is the same signature.
const replayKey = (signature: string) => `replay:${signature.toLowerCase()}`;

const defaultDeps = (): InboundDeps => {
  const store = createDbRateLimitStore(getDb());
  return {
    secret: env.INBOUND_WEBHOOK_SECRET,
    now: () => new Date(),
    ingest: (email) => ingestEmail(email, "webhook"),
    claimSignature: (signature) => claimOnce(store, replayKey(signature)),
    releaseSignature: (signature) => releaseClaim(store, replayKey(signature)),
    schedule: (caseId) => after(() => runCase(caseId)),
  };
};

const fail = (status: number, error: string) =>
  Response.json({ error }, { status });

/**
 * Order matters: size check, then signature over the RAW body, and only then parsing. Nothing
 * from an unauthenticated request is parsed, validated or stored. Errors never echo the input.
 */
export async function handleInboundEmail(
  request: Request,
  deps: InboundDeps = defaultDeps(),
): Promise<Response> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_RAW_BYTES) return fail(413, "PAYLOAD_TOO_LARGE");

  const rawBody = await request.text();
  if (rawBody.length > MAX_RAW_BYTES) return fail(413, "PAYLOAD_TOO_LARGE");

  try {
    verifySignature({
      secret: deps.secret,
      signature: request.headers.get(SIGNATURE_HEADER),
      timestamp: request.headers.get(TIMESTAMP_HEADER),
      rawBody,
      now: deps.now(),
    });
  } catch (error) {
    if (!(error instanceof WebhookAuthError)) throw error;
    return fail(error.code === "NOT_CONFIGURED" ? 503 : 401, error.code);
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return fail(400, "INVALID_JSON");
  }
  const parsed = inboundEmailSchema.safeParse(json);
  if (!parsed.success) {
    const tooBig = parsed.error.issues.some((i) => i.code === "too_big");
    return tooBig ? fail(413, "INPUT_TOO_LONG") : fail(400, "INVALID_BODY");
  }

  // The signature header is present and valid here: verifySignature passed.
  const signature = request.headers.get(SIGNATURE_HEADER) as string;
  if (!(await deps.claimSignature(signature))) return fail(401, "REPLAYED");

  try {
    const { caseId } = await deps.ingest(parsed.data);
    deps.schedule(caseId);
    return Response.json({ caseId }, { status: 201 });
  } catch (error) {
    await deps.releaseSignature(signature);
    throw error;
  }
}
