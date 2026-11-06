import { SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n-de";

/** Any unknown console address; rendered inside the shell. */
export default function ConsoleNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title={t.console.errors.pageNotFoundTitle}
      hint={t.console.errors.pageNotFoundHint}
    >
      <Link
        href="/faelle"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {t.console.errors.toCases}
      </Link>
    </EmptyState>
  );
}
