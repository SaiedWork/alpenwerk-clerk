import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { t } from "@/lib/i18n-de";
import { pageItems } from "@/lib/page-items";
import { cn } from "@/lib/utils";

export type PaginationProps = {
  page: number;
  pageCount: number;
  /** Builds the URL of a page; pagination state lives in the URL. */
  hrefForPage: (page: number) => string;
};

const DISABLED = "pointer-events-none opacity-50";

export function TablePagination({
  page,
  pageCount,
  hrefForPage,
}: PaginationProps) {
  const first = page <= 1;
  const last = page >= pageCount;
  const l = t.console.table;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">
        {l.pageOf
          .replace("{page}", String(page))
          .replace("{pages}", String(pageCount))}
      </span>
      <Pagination aria-label={l.pagination} className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              text={l.previous}
              aria-label={l.previousLabel}
              href={hrefForPage(first ? 1 : page - 1)}
              aria-disabled={first}
              tabIndex={first ? -1 : undefined}
              className={cn(first && DISABLED)}
            />
          </PaginationItem>
          {pageItems(page, pageCount).map((item, i) => (
            <PaginationItem key={item === "ellipsis" ? `gap-${i}` : item}>
              {item === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href={hrefForPage(item)}
                  isActive={item === page}
                  aria-label={l.goToPage.replace("{page}", String(item))}
                >
                  {item}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              text={l.next}
              aria-label={l.nextLabel}
              href={hrefForPage(last ? pageCount : page + 1)}
              aria-disabled={last}
              tabIndex={last ? -1 : undefined}
              className={cn(last && DISABLED)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
