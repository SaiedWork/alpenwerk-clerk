import Link from "next/link";
import { logoutAction } from "../actions";
import { t } from "@/lib/i18n-de";

export function LegacyNav({ operator }: { operator: string }) {
  return (
    <div className="nav" data-testid="legacy-nav">
      <Link href="/legacy/suche" data-testid="nav-search">
        {t.legacy.nav.search}
      </Link>
      <span className="nav-spacer" />
      <span data-testid="nav-operator">{operator}</span>
      <form action={logoutAction}>
        <button type="submit" data-testid="logout">
          {t.legacy.nav.logout}
        </button>
      </form>
    </div>
  );
}
