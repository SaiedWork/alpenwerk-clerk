import {
  BarChart3,
  FolderOpen,
  Info,
  Inbox,
  ScrollText,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/lib/i18n-de";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/faelle", label: t.console.nav.cases, icon: FolderOpen },
  { href: "/posteingang", label: t.console.nav.inbox, icon: Inbox },
  { href: "/freigaben", label: t.console.nav.reviews, icon: UserCheck },
  { href: "/kennzahlen", label: t.console.nav.kpi, icon: BarChart3 },
  { href: "/audit", label: t.console.nav.audit, icon: ScrollText },
  { href: "/ueber", label: t.console.nav.about, icon: Info },
];

/** A nav item is active on its own path and on any sub-path (`/faelle/<id>`). */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
