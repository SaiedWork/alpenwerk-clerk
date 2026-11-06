import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n-de";

export default function Loading() {
  return (
    <div className="space-y-8">
      <PageHeader
        title={t.console.cases.title}
        description={t.console.cases.description}
      />
      <Skeleton className="h-8 w-80" />
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
