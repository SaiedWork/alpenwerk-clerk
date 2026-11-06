import { SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n-de";

export default function CaseNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title={t.console.case.notFoundTitle}
      hint={t.console.case.notFoundHint}
    >
      <Link
        href="/faelle"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {t.console.case.back}
      </Link>
    </EmptyState>
  );
}
