import { ScrollText, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { AuditFilters } from "@/features/audit/components/audit-filters";
import { AuditTable } from "@/features/audit/components/audit-table";
import {
  AUDIT_PAGE_SIZE,
  parseAuditQuery,
} from "@/features/audit/schemas/audit-query";
import { listAudit } from "@/features/audit/server/list-audit";
import { t } from "@/lib/i18n-de";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuditPage({ searchParams }: Props) {
  const query = parseAuditQuery(await searchParams);
  const list = await listAudit(getDb(), query, AUDIT_PAGE_SIZE);
  const filtered = Boolean(query.actor || query.kind || query.caseId);
  const a = t.console.audit;

  return (
    <div className="space-y-8">
      <PageHeader title={a.title} description={a.description} />
      <AuditFilters query={query} total={list.total} />
      {list.total === 0 ? (
        <EmptyState
          icon={filtered ? SearchX : ScrollText}
          title={filtered ? a.noResultsTitle : a.emptyTitle}
          hint={filtered ? a.noResultsHint : a.emptyHint}
        >
          {filtered ? (
            <Link
              href="/audit"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {a.resetFilters}
            </Link>
          ) : null}
        </EmptyState>
      ) : (
        <AuditTable list={list} query={query} />
      )}
    </div>
  );
}
