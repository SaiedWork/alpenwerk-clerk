import Link from "next/link";
import { t } from "@/lib/i18n-de";

export function PolicyNotFound() {
  return (
    <>
      <h1>{t.legacy.policy.title}</h1>
      <p className="error" data-testid="policy-not-found">
        {t.legacy.policy.notFound}
      </p>
      <Link href="/legacy/suche">{t.legacy.nav.search}</Link>
    </>
  );
}
