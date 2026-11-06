import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const rel = (file: string) => path.relative(process.cwd(), file);

/** Strips comments, so prose in `//`, block and JSX comments is not mistaken for UI text. */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
}

const files = walk(SRC).filter(
  (f) => f.endsWith(".tsx") && !f.endsWith("i18n-de.ts"),
);

describe("UI strings come from the dictionary", () => {
  it("has no literal text between JSX tags", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const code = withoutComments(readFileSync(file, "utf8"));
      // Text node: `>` + at least 3 letters + `<`, not an expression or a type argument.
      for (const m of code.matchAll(
        /(?<![=\-])>\s*([^<>{}\n=;()&.]*[A-Za-zÄÖÜäöüß]{3,}[^<>{}\n=;()&.]*)\s*</g,
      )) {
        offenders.push(`${rel(file)}: "${m[1].trim()}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("has no literal text in user-visible attributes", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const code = withoutComments(readFileSync(file, "utf8"));
      for (const m of code.matchAll(
        /\b(placeholder|title|aria-label|alt)="([^"]*[A-Za-zÄÖÜäöüß]{3,}[^"]*)"/g,
      )) {
        // `alt=""` marks a decorative image and is fine; anything with letters is not.
        offenders.push(`${rel(file)}: ${m[1]}="${m[2]}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps German letters out of code outside the dictionary", () => {
    // Normalization and date parsing legitimately handle umlauts; nothing else should.
    const allowed = new Set(["src/lib/normalize.ts", "src/lib/dates.ts"]);
    const offenders = walk(SRC)
      .filter((f) => !f.endsWith("src/lib/i18n-de.ts"))
      .filter((f) => !allowed.has(rel(f)))
      .filter((f) => /[äöüÄÖÜß]/.test(withoutComments(readFileSync(f, "utf8"))))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});
