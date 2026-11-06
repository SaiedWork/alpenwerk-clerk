import { FolderOpen, SearchX } from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { CasesFilters } from "@/features/cases/components/cases-filters";
import { CasesTable } from "@/features/cases/components/cases-table";
import {
  CASES_PAGE_SIZE,
  parseCasesQuery,
} from "@/features/cases/schemas/list-query";
import { listCases } from "@/features/cases/server/list-cases";
import { isBeingProcessed } from "@/features/cases/status";
import { t } from "@/lib/i18n-de";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CasesPage({ searchParams }: Props) {
  const query = parseCasesQuery(await searchParams);
  const list = await listCases(getDb(), query, CASES_PAGE_SIZE);
  const filtered = Boolean(query.status || query.decision);
  const c = t.console.cases;

  return (
    <div className="space-y-8">
      <PageHeader title={c.title} description={c.description} />
      <CasesFilters query={query} total={list.total} />
      {list.total === 0 ? (
        <EmptyState
          icon={filtered ? SearchX : FolderOpen}
          title={filtered ? c.noResultsTitle : c.emptyTitle}
          hint={filtered ? c.noResultsHint : c.emptyHint}
        >
          {filtered ? (
            <Link
              href="/faelle"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {c.resetFilters}
            </Link>
          ) : null}
        </EmptyState>
      ) : (
        <CasesTable list={list} query={query} />
      )}
      <AutoRefresh
        active={list.rows.some((row) => isBeingProcessed(row, new Date()))}
      />
    </div>
  );
}
