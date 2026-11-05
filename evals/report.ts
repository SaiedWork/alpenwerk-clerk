import type { CaseResult, EvalSummary } from "./score";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const mark = (ok: boolean) => (ok ? "ok" : "FAIL");

/** Plain-text report: one line per case, details for failures, then the summary. */
export function formatReport(
  results: CaseResult[],
  summary: EvalSummary,
): string {
  const lines = [
    "id   intent fields decision codes  first divergence",
    ...results.map(
      (r) =>
        `${r.id.padEnd(4)} ${mark(r.intentOk).padEnd(6)} ` +
        `${`${r.fieldsCorrect}/${r.fieldsChecked}`.padEnd(6)} ` +
        `${mark(r.decisionOk).padEnd(8)} ${mark(r.reasonCodesOk).padEnd(5)} ` +
        `${r.firstDivergence ?? "-"}`,
    ),
  ];

  const failures = results.filter((r) => r.firstDivergence !== null);
  if (failures.length > 0) {
    lines.push("", "Failures:");
    for (const r of failures) {
      lines.push(
        r.error
          ? `  ${r.id}: ${r.error}`
          : `  ${r.id}: intent=${r.actual.intent} decision=${r.actual.decision} ` +
              `codes=[${r.actual.reasonCodes.join(", ")}]`,
        ...r.fieldMisses.map((m) => `      ${m}`),
      );
    }
  }

  lines.push(
    "",
    `Cases: ${summary.total} (${summary.allCorrect} fully correct, ${summary.errors} without extraction)`,
    `Intent accuracy:       ${pct(summary.intentAccuracy)}`,
    `Intent set accuracy:   ${pct(summary.intentsAccuracy)}`,
    `Field accuracy:        ${pct(summary.fieldAccuracy)}`,
    `Decision accuracy:     ${pct(summary.decisionAccuracy)}`,
    `Reason code exact:     ${pct(summary.reasonCodeAccuracy)}`,
  );
  return lines.join("\n");
}
