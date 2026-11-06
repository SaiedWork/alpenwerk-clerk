export type PageItem = number | "ellipsis";

/**
 * Page numbers to show: always the first and last page and the current page with one
 * neighbour on each side. A gap of one page shows that page, a bigger gap shows an
 * ellipsis, so page 1 is always one click away.
 */
export function pageItems(page: number, pageCount: number): PageItem[] {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...wanted]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);
  const items: PageItem[] = [];
  for (const [i, n] of pages.entries()) {
    const previous = pages[i - 1];
    if (previous !== undefined && n - previous === 2) items.push(n - 1);
    else if (previous !== undefined && n - previous > 2) items.push("ellipsis");
    items.push(n);
  }
  return items;
}
