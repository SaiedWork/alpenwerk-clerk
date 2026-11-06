import Link from "next/link";
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TablePagination, type PaginationProps } from "./table-pagination";

export type Column<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  className?: string;
};

type DataTableProps<Row> = {
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => string;
  /** When set, every cell links to the row's detail page. */
  getRowHref?: (row: Row) => string;
  pagination?: PaginationProps;
};

/** Server-rendered table. Pagination is link based, so no client state is needed. */
export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  getRowHref,
  pagination,
}: DataTableProps<Row>) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const href = getRowHref?.(row);
              return (
                <TableRow key={getRowKey(row)}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn("p-0", c.className)}>
                      {href ? (
                        <Link href={href} className="block px-2 py-2">
                          {c.cell(row)}
                        </Link>
                      ) : (
                        <div className="px-2 py-2">{c.cell(row)}</div>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {pagination ? <TablePagination {...pagination} /> : null}
    </div>
  );
}
