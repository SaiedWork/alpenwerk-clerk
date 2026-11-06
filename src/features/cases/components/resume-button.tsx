"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n-de";

type State = "idle" | "pending" | "error";

/** Asks the idempotent run endpoint to continue a stuck or failed case, then refreshes. */
export function ResumeButton({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");

  async function resume() {
    setState("pending");
    try {
      const res = await fetch(`/api/cases/${caseId}/run`, { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      setState("idle");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={resume} disabled={state === "pending"}>
        {state === "pending" ? t.console.case.resuming : t.console.case.resume}
        <RotateCw data-icon="inline-end" />
      </Button>
      {state === "error" ? (
        <span role="alert" className="text-sm text-red-700 dark:text-red-300">
          {t.console.case.resumeFailed}
        </span>
      ) : null}
    </div>
  );
}
