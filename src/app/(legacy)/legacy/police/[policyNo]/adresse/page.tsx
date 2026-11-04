import Link from "next/link";
import { FormField } from "@/legacy/components/FormField";
import { LegacyNav } from "@/legacy/components/LegacyNav";
import { PolicyNotFound } from "@/legacy/components/PolicyNotFound";
import { updateAddressAction } from "@/legacy/actions";
import { parseErrorField } from "@/legacy/forms";
import { getPolicyDetail } from "@/legacy/queries";
import { requireOperator } from "@/legacy/session";
import { t } from "@/lib/i18n-de";

export default async function AddressFormPage({
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

  return (
    <>
      <LegacyNav operator={operator} />
      <div className="content">
        {!detail ? (
          <PolicyNotFound />
        ) : (
          <>
            <h1>
              {s.addressTitle} {detail.policy.policyNo}
            </h1>
            {errorField ? (
              <p className="error" data-testid="form-error">
                {s.invalid} {s.fields[errorField]}
              </p>
            ) : null}
            <form action={updateAddressAction}>
              <input
                type="hidden"
                name="policyNo"
                value={detail.policy.policyNo}
              />
              <table className="form">
                <tbody>
                  <FormField
                    name="strasse"
                    label={s.fields.strasse}
                    defaultValue={detail.customer.strasse}
                    maxLength={100}
                  />
                  <FormField
                    name="hausnr"
                    label={s.fields.hausnr}
                    defaultValue={detail.customer.hausnr}
                    maxLength={10}
                  />
                  <FormField
                    name="plz"
                    label={s.fields.plz}
                    defaultValue={detail.customer.plz}
                    maxLength={10}
                  />
                  <FormField
                    name="ort"
                    label={s.fields.ort}
                    defaultValue={detail.customer.ort}
                    maxLength={60}
                  />
                  <FormField
                    name="land"
                    label={s.fields.land}
                    defaultValue={detail.customer.land}
                    maxLength={60}
                  />
                </tbody>
              </table>
              <div className="actions">
                <button type="submit" data-testid="submit-address">
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
          </>
        )}
      </div>
    </>
  );
}
