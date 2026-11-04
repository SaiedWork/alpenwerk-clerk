import { ChangeConfirmation } from "@/legacy/components/ChangeConfirmation";
import { LegacyNav } from "@/legacy/components/LegacyNav";
import { PolicyNotFound } from "@/legacy/components/PolicyNotFound";
import { changeStatusSchema } from "@/legacy/forms";
import { getPolicyDetail } from "@/legacy/queries";
import { requireOperator } from "@/legacy/session";
import { t } from "@/lib/i18n-de";

export default async function AddressConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ policyNo: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const operator = await requireOperator();
  const policyNo = decodeURIComponent((await params).policyNo);
  const status = changeStatusSchema
    .catch("unchanged")
    .parse((await searchParams).status);
  const detail = await getPolicyDetail(policyNo);
  const f = t.legacy.form.fields;

  return (
    <>
      <LegacyNav operator={operator} />
      <div className="content">
        {!detail ? (
          <PolicyNotFound />
        ) : (
          <ChangeConfirmation
            policyNo={detail.policy.policyNo}
            title={t.legacy.form.addressTitle}
            status={status}
            rows={[
              {
                label: f.strasse,
                testId: "confirm-strasse",
                value: detail.customer.strasse,
              },
              {
                label: f.hausnr,
                testId: "confirm-hausnr",
                value: detail.customer.hausnr,
              },
              {
                label: f.plz,
                testId: "confirm-plz",
                value: detail.customer.plz,
              },
              {
                label: f.ort,
                testId: "confirm-ort",
                value: detail.customer.ort,
              },
              {
                label: f.land,
                testId: "confirm-land",
                value: detail.customer.land,
              },
            ]}
          />
        )}
      </div>
    </>
  );
}
