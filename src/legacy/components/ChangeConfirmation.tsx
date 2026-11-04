import Link from "next/link";
import { t } from "@/lib/i18n-de";

export function ChangeConfirmation({
  policyNo,
  title,
  status,
  rows,
}: {
  policyNo: string;
  title: string;
  status: "changed" | "unchanged";
  rows: { label: string; testId: string; value: string }[];
}) {
  const s = t.legacy.form;
  return (
    <div data-testid="confirmation">
      <h1>
        {title} {policyNo}
      </h1>
      <p data-testid="confirmation-status" data-status={status}>
        {status === "changed" ? s.changed : s.unchanged}
      </p>
      <h2>{s.newValues}</h2>
      <table className="form">
        <tbody>
          {rows.map((row) => (
            <tr key={row.testId}>
              <th>{row.label}</th>
              <td data-testid={row.testId}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="actions">
        <Link
          className="btn"
          href={`/legacy/police/${encodeURIComponent(policyNo)}`}
          data-testid="back-to-policy"
        >
          {s.backToPolicy}
        </Link>
      </div>
    </div>
  );
}
