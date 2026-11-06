import { z } from "zod";
import { caseStatuses, decisions } from "@/db/schema/app";

export const CASES_PAGE_SIZE = 10;

// Unknown or repeated values fall back to "no filter" / page 1: the URL is user input,
// but a bad link should show the list, not an error.
const single = (value: unknown) => (Array.isArray(value) ? value[0] : value);

const querySchema = z.object({
  status: z.preprocess(
    single,
    z.enum(caseStatuses).optional().catch(undefined),
  ),
  decision: z.preprocess(single, z.enum(decisions).optional().catch(undefined)),
  page: z.preprocess(
    single,
    z.coerce.number().int().min(1).max(10_000).catch(1),
  ),
});

export type CasesQuery = z.infer<typeof querySchema>;

export function parseCasesQuery(
  searchParams: Record<string, string | string[] | undefined>,
): CasesQuery {
  return querySchema.parse(searchParams);
}

/** Builds `/faelle?...` keeping only the filters that are set. Page 1 is the default. */
export function casesHref(query: Partial<CasesQuery>): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.decision) params.set("decision", query.decision);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const qs = params.toString();
  return qs ? `/faelle?${qs}` : "/faelle";
}
