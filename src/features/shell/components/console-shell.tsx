import { Info } from "lucide-react";
import type { ReactNode } from "react";
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

export function ConsoleShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background px-4">
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
          <footer className="border-t border-amber-300 bg-amber-100 px-4 py-3 flex items-center gap-2 text-sm font-medium text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 md:px-8">
            <Info className="size-4 shrink-0" aria-hidden />
            <span>{t.console.footer}</span>
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
