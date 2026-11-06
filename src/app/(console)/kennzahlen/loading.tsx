import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n-de";

export default function Loading() {
  return (
    <div className="space-y-8">
      <PageHeader
        title={t.console.kpi.title}
        description={t.console.kpi.description}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
