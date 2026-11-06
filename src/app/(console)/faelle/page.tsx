import { FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n-de";

export default function CasesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={t.console.cases.title}
        description={t.console.cases.description}
      />
      <EmptyState
        icon={FolderOpen}
        title={t.console.cases.emptyTitle}
        hint={t.console.cases.emptyHint}
      />
    </div>
  );
}
