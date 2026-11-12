"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Flame, Lock, MoreHorizontal } from "lucide-react";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { destinations, isActive } from "./nav-model";

function Coin({ icon: Icon, active, locked, size = 44 }: { icon: React.ElementType; active: boolean; locked: boolean; size?: number }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full transition-[box-shadow,filter] duration-200",
        locked && "brightness-75 grayscale-[0.7]",
        active && "shadow-[0_0_0_2px_#fbe3a4,0_0_22px_var(--glow)]",
      )}
      style={{ width: size, height: size, background: "radial-gradient(circle at 35% 30%, #ffe7a8, #e0a84a 48%, #7a4f19 100%)" }}
    >
      <span className="absolute inset-[3px] rounded-full border border-[#2b1a0a]/50 bg-[radial-gradient(circle_at_40%_35%,#3a2a1c,#1c1410)]" />
      <Icon className={cn("relative size-[45%]", active ? "text-brass-light" : "text-brass-dim")} aria-hidden />
      {locked && (
        <span className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-oak ring-1 ring-[#b07a2a]">
          <Lock className="size-2.5 text-brass-dim" aria-hidden />
        </span>
      )}
    </span>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_70%,#e0a84a,#5a3a12)] shadow-[0_0_20px_var(--glow)]">
        <Flame className="size-5 text-oak" aria-hidden />
      </span>
      <span className={cn("font-display text-lg leading-tight font-semibold whitespace-nowrap text-parchment", compact ? "block" : "hidden xl:block")}>
        {t.app.name}
      </span>
    </span>
  );
}

/**
 * Game-menu navigation. Wide: brass coins with a label and a live subtitle; pages
 * that open later carry a lock. Medium: coins only. Phone: a slim top bar plus a
 * bottom bar with the four main destinations and a More sheet for the rest.
 */
export function MedallionNav() {
  const pathname = usePathname();
  const items = destinations();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = items.some((d) => !d.primary && isActive(pathname, d.href));

  return (
    <>
      <nav
        aria-label={t.a11y.mainNav}
        className="sticky top-0 hidden h-screen shrink-0 flex-col gap-1 overflow-y-auto border-r border-brass/15 bg-[linear-gradient(180deg,#1a130e,#120d0a)] px-3 py-5 md:flex md:w-[84px] xl:w-[252px]"
      >
        <Link href="/" className="mb-5 flex justify-center px-1 xl:justify-start xl:px-2" aria-label={t.app.name}>
          <Brand />
        </Link>
        {items.map((d) => {
          const active = isActive(pathname, d.href);
          return (
            <Link
              key={d.href}
              href={d.href}
              aria-current={active ? "page" : undefined}
              aria-label={`${d.label}. ${d.subtitle}`}
              className="group relative flex items-center justify-center gap-3 rounded-full py-1.5 pr-3 pl-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring xl:justify-start"
            >
              {active && (
                <motion.span
                  layoutId="medallion-active"
                  className="absolute inset-0 hidden rounded-full bg-[linear-gradient(90deg,#e0a84a33,transparent)] xl:block"
                  transition={{ type: "spring", bounce: 0, visualDuration: 0.3 }}
                />
              )}
              <motion.span whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} className="relative">
                <Coin icon={d.icon} active={active} locked={d.locked !== null} />
              </motion.span>
              <span className="relative hidden min-w-0 xl:block">
                <span className={cn("block truncate font-medium", active ? "text-brass-light" : d.locked ? "text-parchment/65" : "text-parchment")}>
                  {d.label}
                </span>
                <span className="block truncate text-xs text-ink-muted">{d.subtitle}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-brass/20 bg-oak-deep/95 px-4 backdrop-blur md:hidden">
        <Link href="/" aria-label={t.app.name}>
          <Brand compact />
        </Link>
      </header>

      <nav
        aria-label={t.a11y.mobileNav}
        className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-brass/25 bg-oak-deep/95 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),10px)] backdrop-blur md:hidden"
      >
        {items
          .filter((d) => d.primary)
          .map((d) => {
            const active = isActive(pathname, d.href);
            return (
              <Link key={d.href} href={d.href} aria-current={active ? "page" : undefined} className="flex flex-col items-center gap-1 text-[11px]">
                <Coin icon={d.icon} active={active} locked={d.locked !== null} size={40} />
                <span className={active ? "text-brass-light" : "text-ink-muted"}>{d.label}</span>
              </Link>
            );
          })}
        <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" className="flex flex-col items-center gap-1 text-[11px]">
          <Coin icon={MoreHorizontal} active={moreActive} locked={false} size={40} />
          <span className={moreActive ? "text-brass-light" : "text-ink-muted"}>{t.concepts.more}</span>
        </button>
      </nav>

      <BottomSheet open={moreOpen} onOpenChange={setMoreOpen} title={t.concepts.more}>
        <ul className="grid gap-1">
          {items
            .filter((d) => !d.primary)
            .map((d) => (
              <li key={d.href}>
                <Link href={d.href} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-full py-1.5 pr-3 pl-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Coin icon={d.icon} active={isActive(pathname, d.href)} locked={d.locked !== null} />
                  <span>
                    <span className="block font-medium text-parchment">{d.label}</span>
                    <span className="block text-xs text-ink-muted">{d.subtitle}</span>
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </BottomSheet>
    </>
  );
}
