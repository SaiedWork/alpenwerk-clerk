import { createHash } from "node:crypto";
import { normalizeText } from "@/lib/normalize";
import { PROMPT_VERSION } from "./prompt";
import { SCHEMA_VERSION } from "./schema";

/**
 * Provider-independent cache key: prompt version + schema version + normalized subject and body.
 * Whitespace differences share a key; any prompt or schema change invalidates every entry.
 */
export function computeCacheKey(subject: string, body: string): string {
  const material = [
    PROMPT_VERSION,
    SCHEMA_VERSION,
    normalizeText(subject),
    normalizeText(body),
  ].join("\u0000");
  return createHash("sha256").update(material).digest("hex");
}
