import Link from "next/link";
import { LegacyNav } from "@/legacy/components/LegacyNav";
import { PolicyNotFound } from "@/legacy/components/PolicyNotFound";
import { formatCalendarDate, formatEuro } from "@/legacy/format";
import { getPolicyDetail } from "@/legacy/queries";
import { requireOperator } from "@/legacy/session";
import { endOfMonthBerlinIso } from "@/lib/dates";
import { t } from "@/lib/i18n-de";

// Read-only view for the human reviewer. There is deliberately no form and no write path:
// the digital clerk never submits terminations.
export default async function TerminationViewPage({
  params,
}: {
  params: Promise<{ policyNo: string }>;
}) {
  const operator = await requireOperator();
  const policyNo = decodeURIComponent((await params).policyNo);
  const detail = await getPolicyDetail(policyNo);
  const s = t.legacy.termination;
  const f = t.legacy.policy.fields;

  return (
    <>
      <LegacyNav operator={operator} />
      <div className="content">
        {!detail ? (
          <PolicyNotFound />
        ) : (
          <div data-testid="termination-view">
            <h1>
              {s.title} {detail.policy.policyNo}
            </h1>
            <p className="muted" data-testid="termination-readonly">
              {s.readOnly}
            </p>

            <h2>{s.facts}</h2>
            <table className="form">
              <tbody>
                <tr>
                  <th>{f.name}</th>
                  <td data-testid="termination-customer">
                    {detail.customer.vorname} {detail.customer.nachname}
                  </td>
                </tr>
                <tr>
                  <th>{f.product}</th>
                  <td data-testid="termination-product">
                    {detail.policy.produkt}
                  </td>
                </tr>
                <tr>
                  <th>{f.status}</th>
                  <td data-testid="termination-status">
                    {detail.policy.status}
                  </td>
                </tr>
                <tr>
                  <th>{f.start}</th>
                  <td>{formatCalendarDate(detail.policy.beginn)}</td>
                </tr>
                <tr>
                  <th>{f.premium}</th>
                  <td>{formatEuro(detail.policy.beitragMonatlich)}</td>
                </tr>
                <tr>
                  <th>{f.surrenderValue}</th>
                  <td data-testid="termination-surrender-value">
                    {formatEuro(detail.policy.rueckkaufswertIndikativ)}{" "}
                    <span className="muted">({s.surrenderNote})</span>
                  </td>
                </tr>
                <tr>
                  <th>{s.effectiveDate}</th>
                  <td data-testid="termination-effective-date">
                    {formatCalendarDate(endOfMonthBerlinIso(new Date()))}{" "}
                    <span className="muted">({s.effectiveDateNote})</span>
                  </td>
                </tr>
              </tbody>
            </table>

            <h2>{s.beneficiary}</h2>
            {detail.policy.unwiderruflicheBezugsberechtigung ? (
              <p className="error" data-testid="termination-irrevocable">
                {s.irrevocableNotice}
              </p>
            ) : (
              <p data-testid="termination-revocable">{s.revocable}</p>
            )}

            <div className="actions">
              <Link
                className="btn"
                href={`/legacy/police/${encodeURIComponent(detail.policy.policyNo)}`}
                data-testid="back-to-policy"
              >
                {t.legacy.form.backToPolicy}
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
