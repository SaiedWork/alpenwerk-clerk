import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { evalCaseSchema, type EvalCase } from "./schema";

export const DEFAULT_CASES_DIR = path.join(process.cwd(), "evals", "cases");

export class EvalCaseError extends Error {
  readonly code: "INVALID_CASE" | "FILENAME_MISMATCH";
  constructor(code: EvalCaseError["code"], message: string) {
    super(message);
    this.name = "EvalCaseError";
    this.code = code;
  }
}

/**
 * Reads and validates every `<id>.json` in `dir`, sorted by id. Requiring file name == id
 * also guarantees ids are unique.
 */
export function loadEvalCases(dir: string = DEFAULT_CASES_DIR): EvalCase[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  return files.map((file) => {
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
    } catch (cause) {
      throw new EvalCaseError(
        "INVALID_CASE",
        `${file}: not valid JSON (${cause})`,
      );
    }
    const parsed = evalCaseSchema.safeParse(json);
    if (!parsed.success) {
      throw new EvalCaseError(
        "INVALID_CASE",
        `${file}: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      );
    }
    if (file !== `${parsed.data.id}.json`) {
      throw new EvalCaseError(
        "FILENAME_MISMATCH",
        `${file}: file name must match the case id "${parsed.data.id}"`,
      );
    }
    return parsed.data;
  });
}
