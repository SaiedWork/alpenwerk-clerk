import { UserCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getDb } from "@/db/client";
import { ReviewQueueTable } from "@/features/review/components/review-queue-table";
import { listReviewQueue } from "@/features/review/server/list-review-queue";
import { t } from "@/lib/i18n-de";

export default async function ReviewQueuePage() {
  const rows = await listReviewQueue(getDb());
  const q = t.console.reviews;

  return (
    <div className="space-y-8">
      <PageHeader title={q.title} description={q.description} />
      {rows.length === 0 ? (
        <EmptyState icon={UserCheck} title={q.emptyTitle} hint={q.emptyHint} />
      ) : (
        <ReviewQueueTable rows={rows} />
      )}
    </div>
  );
}
