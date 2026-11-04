import { ChangeConfirmation } from "@/legacy/components/ChangeConfirmation";
import { LegacyNav } from "@/legacy/components/LegacyNav";
import { PolicyNotFound } from "@/legacy/components/PolicyNotFound";
import { changeStatusSchema } from "@/legacy/forms";
import { getPolicyDetail } from "@/legacy/queries";
import { requireOperator } from "@/legacy/session";
import { t } from "@/lib/i18n-de";

export default async function BankConfirmationPage({
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
  const mandate = detail?.mandates.find((m) => m.status === "aktiv");
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
            title={t.legacy.form.bankTitle}
            status={status}
            rows={[
              {
                label: f.iban,
                testId: "confirm-iban",
                value: mandate?.iban ?? "",
              },
              {
                label: f.kontoinhaber,
                testId: "confirm-kontoinhaber",
                value: mandate?.kontoinhaber ?? "",
              },
            ]}
          />
        )}
      </div>
    </>
  );
}
