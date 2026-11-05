import Link from "next/link";
import { t } from "@/lib/i18n-de";
import { formatCalendarDate, formatDateTime, formatEuro } from "../format";
import type { PolicyDetail } from "../queries";

function Row({
  label,
  testId,
  children,
}: {
  label: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <th>{label}</th>
      <td data-testid={testId}>{children}</td>
    </tr>
  );
}

export function PolicyOverview({ detail }: { detail: PolicyDetail }) {
  const { policy, customer, mandates, changes } = detail;
  const s = t.legacy.policy;
  const f = s.fields;

  return (
    <div data-testid="policy-overview">
      <h1>
        {s.title} {policy.policyNo}
      </h1>

      <h2>{s.customer}</h2>
      <table className="form">
        <tbody>
          <Row label={f.name} testId="customer-name">
            {customer.anrede} {customer.vorname} {customer.nachname}
          </Row>
          <Row label={f.birthDate} testId="customer-birthdate">
            {formatCalendarDate(customer.geburtsdatum)}
          </Row>
          <Row label={f.email} testId="customer-email">
            {customer.email}
          </Row>
        </tbody>
      </table>

      <h2>{s.address}</h2>
      <table className="form">
        <tbody>
          <Row label={f.street} testId="address-street">
            {customer.strasse} {customer.hausnr}
          </Row>
          <Row label={f.cityLine} testId="address-city">
            {customer.plz} {customer.ort}
          </Row>
          <Row label={f.country} testId="address-country">
            {customer.land}
          </Row>
        </tbody>
      </table>

      <h2>{s.contract}</h2>
      <table className="form">
        <tbody>
          <Row label={f.policyNo} testId="policy-no">
            {policy.policyNo}
          </Row>
          <Row label={f.product} testId="policy-product">
            {policy.produkt}
          </Row>
          <Row label={f.status} testId="policy-status">
            {policy.status}
          </Row>
          <Row label={f.premium} testId="policy-premium">
            {formatEuro(policy.beitragMonatlich)}
          </Row>
          <Row label={f.start} testId="policy-start">
            {formatCalendarDate(policy.beginn)}
          </Row>
          <Row label={f.surrenderValue} testId="policy-surrender-value">
            {formatEuro(policy.rueckkaufswertIndikativ)}
          </Row>
          <Row label={f.irrevocable} testId="policy-irrevocable">
            {policy.unwiderruflicheBezugsberechtigung ? s.yes : s.no}
          </Row>
        </tbody>
      </table>

      <h2>{s.mandate}</h2>
      {mandates.length === 0 ? (
        <p data-testid="mandate-none">{s.noMandate}</p>
      ) : (
        mandates.map((mandate) => (
          <table
            className="form"
            key={mandate.id}
            style={{ marginBottom: 6 }}
            data-testid={`mandate-${mandate.status}`}
          >
            <tbody>
              <Row label={f.status} testId="mandate-status">
                {mandate.status}
              </Row>
              <Row label={f.iban} testId="mandate-iban">
                {mandate.iban}
              </Row>
              <Row label={f.holder} testId="mandate-holder">
                {mandate.kontoinhaber}
              </Row>
              <Row label={f.mandateRef} testId="mandate-ref">
                {mandate.mandatsref}
              </Row>
              <Row label={f.signedOn} testId="mandate-signed-on">
                {formatCalendarDate(mandate.signedOn)}
              </Row>
            </tbody>
          </table>
        ))
      )}

      <h2>{s.changeLog}</h2>
      {changes.length === 0 ? (
        <p data-testid="changelog-empty">{s.noChanges}</p>
      ) : (
        <table data-testid="changelog">
          <thead>
            <tr>
              <th>{s.changeColumns.at}</th>
              <th>{s.changeColumns.field}</th>
              <th>{s.changeColumns.old}</th>
              <th>{s.changeColumns.new}</th>
              <th>{s.changeColumns.by}</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <tr key={change.id} data-testid="changelog-row">
                <td>{formatDateTime(change.changedAt)}</td>
                <td>{change.field}</td>
                <td>{change.oldValue}</td>
                <td>{change.newValue}</td>
                <td>{change.changedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="actions">
        <Link
          className="btn"
          href={`/legacy/police/${policy.policyNo}/adresse`}
          data-testid="edit-address"
        >
          {s.editAddress}
        </Link>
        <Link
          className="btn"
          href={`/legacy/police/${policy.policyNo}/bank`}
          data-testid="edit-bank"
        >
          {s.editBank}
        </Link>
        <Link
          className="btn"
          href={`/legacy/police/${policy.policyNo}/kuendigung`}
          data-testid="view-termination"
        >
          {s.viewTermination}
        </Link>
      </div>
    </div>
  );
}
