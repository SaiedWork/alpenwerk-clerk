import Link from "next/link";
import { t } from "@/lib/i18n-de";

export default function LegacyNotFound() {
  return (
    <div className="content">
      <h1>{t.legacy.notFoundTitle}</h1>
      <p className="muted">{t.legacy.notFoundHint}</p>
      <div className="actions">
        <Link className="btn" href="/legacy/suche">
          {t.legacy.toSearch}
        </Link>
      </div>
    </div>
  );
}
