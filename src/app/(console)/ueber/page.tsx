import { PageHeader } from "@/components/shared/page-header";
import { AboutContent } from "@/features/about/components/about-content";
import { t } from "@/lib/i18n-de";

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title={t.console.about.title}
        description={t.console.about.description}
      />
      <AboutContent />
    </div>
  );
}
