"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { tr } from "@/i18n/tr";
import { NAV_ITEMS } from "./nav-items";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Flame className="size-4" aria-hidden />
        </span>
        <span className="font-semibold tracking-tight">{tr.app.name}</span>
      </div>
      <nav aria-label="Ana menü" className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-ring",
                active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
              )}
            >
              <Icon className={cn("size-4", active && "text-primary")} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <p className="px-5 py-4 text-xs text-muted-foreground">{tr.app.tagline}</p>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Mobil menü"
      className="flex gap-1 overflow-x-auto border-b border-sidebar-border bg-sidebar px-2 py-2 md:hidden"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75",
              active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {active && label}
          </Link>
        );
      })}
    </nav>
  );
}
