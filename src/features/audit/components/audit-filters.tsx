"use client";

import { CircleX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  ALL,
  FilterField,
  type FilterItem,
} from "@/components/shared/filter-field";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { auditActors } from "@/db/schema/app";
import { t } from "@/lib/i18n-de";
import {
  AUDIT_KINDS,
  auditHref,
  type AuditQuery,
} from "../schemas/audit-query";

const a = t.console.audit;

const ACTOR_ITEMS: FilterItem[] = [
  { value: ALL, label: a.all },
  ...auditActors.map((x) => ({ value: x, label: a.actors[x] })),
];
const KIND_ITEMS: FilterItem[] = [
  { value: ALL, label: a.all },
  ...AUDIT_KINDS.map((x) => ({ value: x, label: a.kinds[x] })),
];

/** Filters live in the URL; changing one goes back to page 1 and keeps the case filter. */
export function AuditFilters({
  query,
  total,
}: {
  query: AuditQuery;
  total: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function navigate(next: Partial<AuditQuery>) {
    startTransition(() =>
      router.replace(
        auditHref({ caseId: query.caseId, ...query, ...next, page: 1 }),
      ),
    );
  }

  const filtered = Boolean(query.actor || query.kind || query.caseId);
  const count =
    total === 1
      ? t.console.table.totalOne
      : t.console.table.total.replace("{count}", String(total));

  return (
    <div className="flex flex-wrap items-end gap-3" aria-busy={pending}>
      <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
        <FilterField
          label={a.filterActor}
          items={ACTOR_ITEMS}
          value={query.actor}
          onChange={(v) => navigate({ actor: v as AuditQuery["actor"] })}
        />
        <FilterField
          label={a.filterKind}
          items={KIND_ITEMS}
          value={query.kind}
          onChange={(v) => navigate({ kind: v as AuditQuery["kind"] })}
        />
      </div>
      <div className="flex min-h-8 w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:w-auto sm:flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {filtered ? (
            <Button variant="outline" onClick={() => router.replace("/audit")}>
              {a.resetFilters}
              <CircleX data-icon="inline-end" />
            </Button>
          ) : null}
          {query.caseId ? (
            <ToneBadge tone="info">{a.onlyCase}</ToneBadge>
          ) : null}
        </div>
        <span className="ml-auto text-sm text-muted-foreground">{count}</span>
      </div>
    </div>
  );
}
