"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Flame, Lock, MoreHorizontal } from "lucide-react";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { destinations, isActive, slideDirection, type Destination } from "./nav-model";

function Coin({ icon: Icon, active, locked, size = 44 }: { icon: React.ElementType; active: boolean; locked: boolean; size?: number }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full transition-[filter] duration-200",
        locked && "brightness-75 grayscale-[0.7]",
        active && "shadow-[0_0_0_2px_#fbe3a4,0_0_22px_var(--glow)]",
      )}
      style={{ width: size, height: size, background: "radial-gradient(circle at 35% 30%, #ffe7a8, #e0a84a 48%, #7a4f19 100%)" }}
    >
      <span className="absolute inset-[3px] rounded-full border border-[#2b1a0a]/50 bg-[radial-gradient(circle_at_40%_35%,#3a2a1c,#1c1410)]" />
      <Icon className={cn("relative size-[45%]", active ? "text-brass-light" : "text-brass-dim")} aria-hidden />
      {locked && (
        <span className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-oak ring-1 ring-[#b07a2a]">
          <Lock className="size-2 text-brass-dim" aria-hidden />
        </span>
      )}
    </span>
  );
}

/** The app's own mark; the name shows on phones and on very wide screens. */
function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_70%,#e0a84a,#5a3a12)] shadow-[0_0_20px_var(--glow)]">
        <Flame className="size-[18px] text-oak" aria-hidden />
      </span>
      <span className="font-display text-lg leading-tight font-semibold whitespace-nowrap text-parchment md:hidden 2xl:block">
        {t.app.name}
      </span>
    </span>
  );
}

/** One brass tab. Its label shows from 1280 px; below that the coin carries a tooltip. */
function MenuTab({ d, pathname }: { d: Destination; pathname: string }) {
  const active = isActive(pathname, d.href);
  const label = d.locked ? t.a11y.locked(d.label, d.locked) : d.label;
  return (
    <li className="relative">
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={d.href}
              transitionTypes={slideDirection(pathname, d.href)}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              className="group relative flex h-11 items-center gap-2 rounded-full px-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring xl:pr-3.5"
            />
          }
        >
          {active && (
            <motion.span
              layoutId="menu-tab-active"
              aria-hidden
              className="absolute inset-0 rounded-full border border-brass/45 bg-[linear-gradient(180deg,#e0a84a30,#e0a84a0d)] shadow-[inset_0_1px_0_#ffe9b340]"
              transition={{ type: "spring", bounce: 0, visualDuration: 0.3 }}
            />
          )}
          <motion.span whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} className="relative">
            <Coin icon={d.icon} active={active} locked={d.locked !== null} size={32} />
          </motion.span>
          <span
            className={cn(
              "relative hidden text-sm font-medium whitespace-nowrap xl:block",
              active ? "text-brass-light" : d.locked ? "text-parchment/60" : "text-parchment/90 group-hover:text-parchment",
            )}
          >
            {d.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">{d.locked ? `${d.label} · ${d.subtitle}` : d.label}</TooltipContent>
      </Tooltip>
    </li>
  );
}

/**
 * Game-menu navigation. From 768 px: a slim top bar of brass tabs in page order
 * (pages sit side by side; switching slides left or right). Pages that open later
 * keep their lock. Phone: a slim brand bar on top and the bottom coin bar with More.
 */
export function GameMenuBar() {
  const pathname = usePathname();
  const items = destinations();
  return (
    <header className="flex h-14 items-center gap-4 border-b border-brass/20 bg-[linear-gradient(180deg,#1d1510f2,#140e0bf2)] px-4 backdrop-blur md:px-6">
      <Link href="/" transitionTypes={slideDirection(pathname, "/")} aria-label={t.app.name} className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Brand />
      </Link>
      <nav aria-label={t.a11y.mainNav} className="hidden min-w-0 flex-1 justify-center md:flex">
        <ul className="flex items-center gap-0.5 lg:gap-1.5">
          {items.map((d) => (
            <MenuTab key={d.href} d={d} pathname={pathname} />
          ))}
        </ul>
      </nav>
      <kbd className="stat ml-auto hidden shrink-0 text-xs tracking-[0.08em] text-ink-muted 2xl:block">{t.a11y.keysHint}</kbd>
    </header>
  );
}

/** Phone: the four main destinations as coins plus a More sheet for the rest. */
export function MobileCoinBar() {
  const pathname = usePathname();
  const items = destinations();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = items.some((d) => !d.primary && isActive(pathname, d.href));

  return (
    <>
      <nav
        aria-label={t.a11y.mobileNav}
        className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-brass/25 bg-oak-deep/95 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),10px)] backdrop-blur md:hidden"
        style={{ viewTransitionName: "mobile-coin-bar" }}
      >
        {items
          .filter((d) => d.primary)
          .map((d) => {
            const active = isActive(pathname, d.href);
            return (
              <Link
                key={d.href}
                href={d.href}
                transitionTypes={slideDirection(pathname, d.href)}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 text-[11px]"
              >
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
                <Link
                  href={d.href}
                  transitionTypes={slideDirection(pathname, d.href)}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-full py-1.5 pr-3 pl-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
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
