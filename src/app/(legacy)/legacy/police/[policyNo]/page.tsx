import { LegacyNav } from "@/legacy/components/LegacyNav";
import { PolicyNotFound } from "@/legacy/components/PolicyNotFound";
import { PolicyOverview } from "@/legacy/components/PolicyOverview";
import { getPolicyDetail } from "@/legacy/queries";
import { requireOperator } from "@/legacy/session";

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ policyNo: string }>;
}) {
  const operator = await requireOperator();
  const { policyNo } = await params;
  const detail = await getPolicyDetail(decodeURIComponent(policyNo));

  return (
    <>
      <LegacyNav operator={operator} />
      <div className="content">
        {detail ? <PolicyOverview detail={detail} /> : <PolicyNotFound />}
      </div>
    </>
  );
}
