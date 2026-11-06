import { describe, expect, it } from "vitest";
import { computeCacheKey } from "@/agent/llm/cache-key";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseSeedCacheFile } from "@/agent/llm/seed-file";
import { SAMPLE_GROUPS, SAMPLES } from "@/features/inbox/samples";
import { simulatorEmailSchema } from "@/features/inbox/schemas/simulator";
import { t } from "@/lib/i18n-de";

describe("simulator samples", () => {
  it("has unique ids, valid emails and German texts", () => {
    expect(new Set(SAMPLES.map((s) => s.id)).size).toBe(SAMPLES.length);
    for (const s of SAMPLES) {
      expect(simulatorEmailSchema.safeParse(s.email).success).toBe(true);
      expect(t.console.inbox.samples[s.id].title.length).toBeGreaterThan(0);
      expect(SAMPLE_GROUPS).toContain(s.group);
    }
  });

  it("has a recorded model answer for every sample, so none costs a live call", () => {
    const file = path.join(process.cwd(), "seed", "llm-cache.json");
    const keys = new Set(
      parseSeedCacheFile(readFileSync(file, "utf8")).map((row) => row.key),
    );
    for (const s of SAMPLES) {
      expect(keys.has(computeCacheKey(s.email.subject, s.email.body))).toBe(
        true,
      );
    }
  });
});
