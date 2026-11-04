import Link from "next/link";
import { FormField } from "@/legacy/components/FormField";
import { LegacyNav } from "@/legacy/components/LegacyNav";
import { PolicyNotFound } from "@/legacy/components/PolicyNotFound";
import { updateBankAction } from "@/legacy/actions";
import { parseErrorField } from "@/legacy/forms";
import { getPolicyDetail } from "@/legacy/queries";
import { requireOperator } from "@/legacy/session";
import { t } from "@/lib/i18n-de";

export default async function BankFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ policyNo: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const operator = await requireOperator();
  const policyNo = decodeURIComponent((await params).policyNo);
  const errorField = parseErrorField((await searchParams).error);
  const detail = await getPolicyDetail(policyNo);
  const s = t.legacy.form;
  // Newest active mandate first (same choice as the update).
  const mandate = detail?.mandates.find((m) => m.status === "aktiv");

  return (
    <>
      <LegacyNav operator={operator} />
      <div className="content">
        {!detail ? (
          <PolicyNotFound />
        ) : (
          <>
            <h1>
              {s.bankTitle} {detail.policy.policyNo}
            </h1>
            {errorField ? (
              <p className="error" data-testid="form-error">
                {s.invalid} {s.fields[errorField]}
              </p>
            ) : null}
            {!mandate ? (
              <p className="error" data-testid="no-mandate">
                {s.noMandate}
              </p>
            ) : (
              <form action={updateBankAction}>
                <input
                  type="hidden"
                  name="policyNo"
                  value={detail.policy.policyNo}
                />
                <table className="form">
                  <tbody>
                    <FormField
                      name="iban"
                      label={s.fields.iban}
                      defaultValue={mandate.iban}
                      maxLength={40}
                    />
                    <FormField
                      name="kontoinhaber"
                      label={s.fields.kontoinhaber}
                      defaultValue={mandate.kontoinhaber}
                      maxLength={100}
                    />
                  </tbody>
                </table>
                <div className="actions">
                  <button type="submit" data-testid="submit-bank">
                    {s.save}
                  </button>
                  <Link
                    className="btn"
                    href={`/legacy/police/${encodeURIComponent(detail.policy.policyNo)}`}
                    data-testid="cancel"
                  >
                    {s.cancel}
                  </Link>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </>
  );
}
