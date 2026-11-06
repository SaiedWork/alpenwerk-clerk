"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/features/review/actions/action-result";
import { t } from "@/lib/i18n-de";

/**
 * Runs a server action with double-submit protection and a German error message.
 * `run` resolves to `true` when the action succeeded.
 */
export function useReviewAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult>): Promise<boolean> {
    if (pending) return Promise.resolve(false);
    setError(null);
    return new Promise((resolve) => {
      startTransition(async () => {
        try {
          const result = await action();
          if (!result.ok) setError(t.console.case.review.errors[result.error]);
          resolve(result.ok);
        } catch {
          setError(t.console.case.review.errors.UNKNOWN);
          resolve(false);
        }
      });
    });
  }

  return { pending, error, run, clearError: () => setError(null) };
}
