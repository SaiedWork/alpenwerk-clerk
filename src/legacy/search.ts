import { z } from "zod";

const searchTermSchema = z.string().trim().min(1).max(100);

/** Validates the raw `q` query parameter. Returns `null` for missing or blank input. */
export function parseSearchTerm(raw: unknown): string | null {
  const result = searchTermSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** Escapes `%`, `_` and `\` so user input is matched literally inside an ILIKE pattern. */
export function toLikePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
