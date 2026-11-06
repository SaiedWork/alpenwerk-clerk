import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n-de";

export default function Loading() {
  return (
    <div className="space-y-8">
      <PageHeader
        title={t.console.inbox.title}
        description={t.console.inbox.description}
      />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
