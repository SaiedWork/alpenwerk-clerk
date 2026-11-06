import { DataTable, type Column } from "@/components/shared/data-table";
import { ReasonCodeBadge } from "@/components/shared/reason-code-badge";
import { ToneBadge } from "@/components/shared/tone-badge";
import { formatDateTime } from "@/lib/dates";
import { t } from "@/lib/i18n-de";
import { reviewTask, type ReviewQueueRow } from "../server/list-review-queue";

const q = t.console.reviews;

const COLUMNS: readonly Column<ReviewQueueRow>[] = [
  {
    key: "task",
    header: q.columns.task,
    className: "whitespace-nowrap",
    cell: (row) => {
      const task = reviewTask(row.status);
      return (
        <ToneBadge tone={task === "review" ? "warning" : "info"}>
          {q.task[task]}
        </ToneBadge>
      );
    },
  },
  {
    key: "sender",
    header: q.columns.sender,
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
    header: q.columns.intent,
    cell: (row) => (row.intent ? t.console.intent[row.intent] : "–"),
  },
  {
    key: "reasons",
    header: q.columns.reasons,
    cell: (row) =>
      row.reasonCodes.length === 0 ? (
        "–"
      ) : (
        <span className="flex flex-wrap gap-1">
          {row.reasonCodes.map((code) => (
            <ReasonCodeBadge key={code} code={code} />
          ))}
        </span>
      ),
  },
  {
    key: "waiting",
    header: q.columns.waiting,
    className: "whitespace-nowrap text-right",
    cell: (row) => formatDateTime(row.updatedAt),
  },
];

export function ReviewQueueTable({ rows }: { rows: ReviewQueueRow[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={rows}
      getRowKey={(row) => row.id}
      getRowHref={(row) => `/faelle/${row.id}`}
    />
  );
}
