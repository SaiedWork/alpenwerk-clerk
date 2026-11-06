"use client";

import { CircleX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { caseStatuses, decisions } from "@/db/schema/app";
import { t } from "@/lib/i18n-de";
import { casesHref, type CasesQuery } from "../schemas/list-query";

const ALL = "all";

type Item = { value: string; label: string };

const STATUS_ITEMS: Item[] = [
  { value: ALL, label: t.console.cases.all },
  ...caseStatuses.map((s) => ({ value: s, label: t.console.status[s] })),
];
const DECISION_ITEMS: Item[] = [
  { value: ALL, label: t.console.cases.all },
  ...decisions.map((d) => ({ value: d, label: t.console.decision[d] })),
];

type FilterFieldProps = {
  label: string;
  items: Item[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
};

function FilterField({ label, items, value, onChange }: FilterFieldProps) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm">
      <span>{label}</span>
      <Select
        items={items}
        value={value ?? ALL}
        onValueChange={(v) => onChange(v === ALL ? undefined : String(v))}
      >
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue />
        </SelectTrigger>
        {/* Opens below the trigger at full height, so the list never scrolls. */}
        <SelectContent
          alignItemWithTrigger={false}
          align="start"
          className="max-h-none overflow-y-visible"
        >
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

/** Filters live in the URL; changing one goes back to page 1. */
export function CasesFilters({
  query,
  total,
}: {
  query: CasesQuery;
  total: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function navigate(next: Partial<CasesQuery>) {
    startTransition(() => router.replace(casesHref(next)));
  }

  const filtered = Boolean(query.status || query.decision);
  const count =
    total === 1
      ? t.console.table.totalOne
      : t.console.table.total.replace("{count}", String(total));

  return (
    <div className="flex flex-wrap items-end gap-3" aria-busy={pending}>
      <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
        <FilterField
          label={t.console.cases.filterStatus}
          items={STATUS_ITEMS}
          value={query.status}
          onChange={(v) =>
            navigate({
              decision: query.decision,
              status: v as CasesQuery["status"],
            })
          }
        />
        <FilterField
          label={t.console.cases.filterDecision}
          items={DECISION_ITEMS}
          value={query.decision}
          onChange={(v) =>
            navigate({
              status: query.status,
              decision: v as CasesQuery["decision"],
            })
          }
        />
      </div>
      {/* Aligned with the selects only (items-end), not with their labels. */}
      <div className="flex min-h-8 w-full items-center justify-between gap-3 sm:w-auto sm:flex-1">
        {filtered ? (
          <Button variant="outline" onClick={() => navigate({})}>
            {t.console.cases.resetFilters}
            <CircleX data-icon="inline-end" />
          </Button>
        ) : null}
        <span className="ml-auto text-sm text-muted-foreground">{count}</span>
      </div>
    </div>
  );
}
