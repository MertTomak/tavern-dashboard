"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Flame } from "lucide-react";
import { layoutSpring } from "@/components/motion/timing";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { NAV_ITEMS } from "./nav-items";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Brand() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_70%,var(--primary),color-mix(in_oklab,var(--primary),black_45%))] text-primary-foreground shadow-[0_0_18px_var(--glow)]">
        <Flame className="size-4" aria-hidden />
      </span>
      <span className="font-display text-lg font-semibold whitespace-nowrap">{t.app.name}</span>
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/90 md:flex">
      <div className="flex h-20 items-center px-5">
        <Brand />
      </div>
      <nav aria-label={t.a11y.mainNav} className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "glow-hover relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors duration-150 hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-ring",
                active && "font-semibold text-sidebar-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  transition={layoutSpring}
                  className="absolute inset-0 rounded-md bg-sidebar-accent"
                  aria-hidden
                >
                  <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
                </motion.span>
              )}
              <Icon className={cn("relative size-4", active && "text-primary")} aria-hidden />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </nav>
      <p className="px-5 py-4 text-xs text-muted-foreground">{t.app.tagline}</p>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-sidebar-border bg-sidebar md:hidden">
      <div className="flex h-14 items-center px-4">
        <Brand />
      </div>
      <nav aria-label={t.a11y.mobileNav} className="flex gap-1 overflow-x-auto px-2 pb-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground",
                active && "font-semibold text-sidebar-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-nav-active"
                  transition={layoutSpring}
                  className="absolute inset-0 rounded-md bg-sidebar-accent shadow-[inset_0_-2px_0_var(--primary)]"
                  aria-hidden
                />
              )}
              <Icon className={cn("relative size-4", active && "text-primary")} aria-hidden />
              {active && <span className="relative">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
