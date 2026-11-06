import { useSyncExternalStore } from "react";

// The sidebar becomes a sheet up to and including 1024 px (tablet), so the layout
// switches at 1025 px. Keep in sync with the `min-[1025px]:` classes in ui/sidebar.tsx.
const MOBILE_BREAKPOINT = 1025;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** True up to 1024 px (tablet and phone). Server render and first paint report desktop. */
export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
