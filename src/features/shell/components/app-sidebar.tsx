"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { t } from "@/lib/i18n-de";
import { isActivePath, NAV_ITEMS } from "./nav-items";

export function AppSidebar({ reviewCount }: { reviewCount: number }) {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="flex-row items-center gap-3 px-4 py-4">
        {/* The app icon, served by Next from src/app/icon.svg. SVG needs no optimizing. */}
        <Image
          src="/icon.svg"
          alt=""
          width={32}
          height={32}
          unoptimized
          className="size-8 shrink-0"
        />
        <div className="min-w-0">
          <p className="whitespace-nowrap text-[0.8125rem] font-semibold leading-tight">
            {t.console.brand}
          </p>
          <p className="text-xs text-muted-foreground">{t.console.brandSub}</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t.console.navLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={isActivePath(pathname, href)}
                    className="data-active:bg-foreground/10 data-active:font-semibold"
                    render={<Link href={href} />}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                  {href === "/freigaben" && reviewCount > 0 ? (
                    <SidebarMenuBadge
                      aria-label={t.console.reviews.navCount.replace(
                        "{count}",
                        String(reviewCount),
                      )}
                    >
                      {reviewCount}
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Plain anchor: /legacy is a separate app with its own layout. */}
            <SidebarMenuButton
              render={<a href="/legacy" target="_blank" rel="noreferrer" />}
            >
              <ExternalLink />
              <span>{t.console.nav.legacy}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
