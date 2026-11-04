import Link from "next/link";
import { LegacyNav } from "@/legacy/components/LegacyNav";
import { PolicyOverview } from "@/legacy/components/PolicyOverview";
import { getPolicyDetail } from "@/legacy/queries";
import { requireOperator } from "@/legacy/session";
import { t } from "@/lib/i18n-de";

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
        {detail ? (
          <PolicyOverview detail={detail} />
        ) : (
          <>
            <h1>{t.legacy.policy.title}</h1>
            <p className="error" data-testid="policy-not-found">
              {t.legacy.policy.notFound}
            </p>
            <Link href="/legacy/suche">{t.legacy.nav.search}</Link>
          </>
        )}
      </div>
    </>
  );
}
