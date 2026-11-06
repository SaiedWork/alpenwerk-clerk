"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-runs the server component tree every `intervalMs` while `active`. Pauses in a
 * hidden tab and refreshes once when the tab becomes visible again.
 */
export function AutoRefresh({
  active,
  intervalMs = 3000,
}: {
  active: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [active, intervalMs, router]);

  return null;
}
