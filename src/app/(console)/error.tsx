"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n-de";

const e = t.console.errors;

/**
 * Catches any error while rendering a console page, such as an unreachable database. It shows
 * a German message and a retry, never the error text. The digest is a random reference that
 * also appears in the server log, so it is safe to show.
 */
export default function ConsoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState icon={TriangleAlert} title={e.errorTitle} hint={e.errorHint}>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={reset}>
          {e.retry}
        </Button>
        <Link
          href="/faelle"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          {e.toCases}
        </Link>
      </div>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">
          {e.reference.replace("{digest}", error.digest)}
        </p>
      ) : null}
    </EmptyState>
  );
}
