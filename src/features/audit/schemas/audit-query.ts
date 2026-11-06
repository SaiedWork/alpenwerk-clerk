import { z } from "zod";
import { auditActors } from "@/db/schema/app";

export const AUDIT_PAGE_SIZE = 20;

/** Filter by the first part of the action name (`case.received`, `step.analyze.succeeded`, ...). */
export const AUDIT_KINDS = ["case", "step", "review", "reply"] as const;

// A bad link shows the unfiltered list, not an error (the URL is user input).
const single = (value: unknown) => (Array.isArray(value) ? value[0] : value);

const querySchema = z.object({
  actor: z.preprocess(single, z.enum(auditActors).optional().catch(undefined)),
  kind: z.preprocess(single, z.enum(AUDIT_KINDS).optional().catch(undefined)),
  caseId: z.preprocess(single, z.uuid().optional().catch(undefined)),
  page: z.preprocess(
    single,
    z.coerce.number().int().min(1).max(10_000).catch(1),
  ),
});

export type AuditQuery = z.infer<typeof querySchema>;

export function parseAuditQuery(
  searchParams: Record<string, string | string[] | undefined>,
): AuditQuery {
  // The URL says `case`, the query says `caseId`.
  return querySchema.parse({ ...searchParams, caseId: searchParams.case });
}

/** Builds `/audit?...` keeping only the filters that are set. Page 1 is the default. */
export function auditHref(query: Partial<AuditQuery>): string {
  const params = new URLSearchParams();
  if (query.actor) params.set("actor", query.actor);
  if (query.kind) params.set("kind", query.kind);
  if (query.caseId) params.set("case", query.caseId);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const qs = params.toString();
  return qs ? `/audit?${qs}` : "/audit";
}
