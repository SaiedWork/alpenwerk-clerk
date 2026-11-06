import { Info } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { t } from "@/lib/i18n-de";
import { AppSidebar } from "./app-sidebar";
import { ThemeToggle } from "./theme-toggle";

// Height of the demo banner; the sidebar and the sticky header start below it.
const BANNER_HEIGHT = "2rem";

export function ConsoleShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <div style={{ "--banner-height": BANNER_HEIGHT } as CSSProperties}>
        <div
          role="note"
          className="sticky top-0 z-50 flex h-(--banner-height) items-center justify-center gap-2 border-b border-amber-300 bg-amber-100 px-4 text-xs font-medium text-amber-950 sm:text-sm dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        >
          <Info className="size-4 shrink-0" aria-hidden />
          <span className="truncate sm:hidden">{t.console.bannerShort}</span>
          <span className="hidden truncate sm:inline">{t.console.banner}</span>
        </div>
        <SidebarProvider className="min-h-[calc(100svh-var(--banner-height))]">
          <AppSidebar />
          <SidebarInset className="min-w-0">
            <header className="sticky top-(--banner-height) z-10 flex h-12 items-center gap-2 border-b bg-background px-4">
              <div className="flex items-center gap-2 min-[1025px]:hidden">
                <SidebarTrigger aria-label={t.console.openMenu} />
                <Separator orientation="vertical" className="h-4" />
                <span className="text-sm font-medium">{t.console.brand}</span>
              </div>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </header>
            <div className="min-w-0 flex-1 p-4 md:p-8">
              <div className="mx-auto w-full max-w-7xl">{children}</div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </TooltipProvider>
  );
}
