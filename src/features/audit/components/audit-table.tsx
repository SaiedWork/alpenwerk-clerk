import Link from "next/link";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ToneBadge, type Tone } from "@/components/shared/tone-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateTime } from "@/lib/dates";
import { t } from "@/lib/i18n-de";
import { auditHref, type AuditQuery } from "../schemas/audit-query";
import type { AuditPage, AuditRow } from "../server/list-audit";
import { auditActionLabel, auditDetailsSummary } from "../view/audit-view";

const c = t.console.audit.columns;

const ACTOR_TONE: Record<AuditRow["actor"], Tone> = {
  agent: "info",
  human: "success",
  system: "neutral",
};

const COLUMNS: readonly Column<AuditRow>[] = [
  {
    key: "time",
    header: c.time,
    className: "whitespace-nowrap",
    cell: (row) => formatDateTime(row.at),
  },
  {
    key: "actor",
    header: c.actor,
    cell: (row) => (
      <ToneBadge tone={ACTOR_TONE[row.actor]}>
        {t.console.audit.actors[row.actor]}
      </ToneBadge>
    ),
  },
  {
    key: "action",
    header: c.action,
    className: "min-w-48 whitespace-normal",
    cell: (row) => auditActionLabel(row.action),
  },
  {
    key: "details",
    header: c.details,
    className:
      "min-w-56 max-w-[24rem] whitespace-normal break-words text-muted-foreground",
    cell: (row) => auditDetailsSummary(row.details) ?? "–",
  },
  {
    key: "case",
    header: c.case,
    className: "max-w-[16rem]",
    cell: (row) => {
      if (!row.caseId) return t.console.audit.noCase;
      const label = row.caseSubject ?? row.caseId;
      // The cell is truncated, so the tooltip shows the full subject.
      return (
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href={`/faelle/${row.caseId}`}
                className="block truncate underline-offset-4 hover:underline"
              />
            }
          >
            {label}
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">{label}</TooltipContent>
        </Tooltip>
      );
    },
  },
];

export function AuditTable({
  list,
  query,
}: {
  list: AuditPage;
  query: AuditQuery;
}) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={list.rows}
      getRowKey={(row) => String(row.id)}
      pagination={{
        page: list.page,
        pageCount: list.pageCount,
        hrefForPage: (page) => auditHref({ ...query, page }),
      }}
    />
  );
}
