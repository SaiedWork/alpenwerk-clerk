import { DataTable, type Column } from "@/components/shared/data-table";
import { DecisionBadge } from "@/components/shared/decision-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/dates";
import { t } from "@/lib/i18n-de";
import { formatHandlingTime } from "../format";
import { casesHref, type CasesQuery } from "../schemas/list-query";
import type { CaseListPage, CaseListRow } from "../server/list-cases";

const c = t.console.cases.columns;

const COLUMNS: readonly Column<CaseListRow>[] = [
  {
    key: "received",
    header: c.received,
    className: "whitespace-nowrap",
    cell: (row) => formatDateTime(row.receivedAt),
  },
  {
    key: "sender",
    header: c.sender,
    className: "max-w-[18rem]",
    cell: (row) => (
      <>
        <div className="truncate font-medium">{row.fromEmail}</div>
        <div className="truncate text-xs text-muted-foreground">
          {row.subject}
        </div>
      </>
    ),
  },
  {
    key: "intent",
    header: c.intent,
    cell: (row) => (row.intent ? t.console.intent[row.intent] : "–"),
  },
  {
    key: "decision",
    header: c.decision,
    cell: (row) => <DecisionBadge decision={row.decision} />,
  },
  {
    key: "status",
    header: c.status,
    cell: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: "handling",
    header: c.handling,
    className: "whitespace-nowrap text-right tabular-nums",
    cell: (row) => formatHandlingTime(row.handlingMs),
  },
];

type CasesTableProps = { list: CaseListPage; query: CasesQuery };

export function CasesTable({ list, query }: CasesTableProps) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={list.rows}
      getRowKey={(row) => row.id}
      getRowHref={(row) => `/faelle/${row.id}`}
      pagination={{
        page: list.page,
        pageCount: list.pageCount,
        hrefForPage: (page) => casesHref({ ...query, page }),
      }}
    />
  );
}
