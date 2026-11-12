"use client";

import { LayoutGroup, motion } from "motion/react";
import { layoutSpring } from "@/components/motion/timing";
import { classColor } from "@/lib/cards/class-colors";
import { formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import type { DeckView, StandingView } from "./overview-view";

const head = "stat text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase";

/** Bar from the 50% line: right for winning matchups, left for losing ones. */
function FiftyBar({ rate }: { rate: number }) {
  const good = rate >= 0.5;
  return (
    <span className="relative block h-1.5 rounded-full bg-hairline" aria-hidden>
      <span
        className={cn("absolute inset-y-0", good ? "rounded-r-full bg-win" : "rounded-l-full bg-loss")}
        style={{ left: `${Math.min(rate, 0.5) * 100}%`, width: `${Math.abs(rate - 0.5) * 100}%` }}
      />
      <span className="absolute -inset-y-1 left-1/2 w-px bg-muted-foreground/60" />
    </span>
  );
}

/**
 * Opponent-class standings. Rows are `layout` items, so when a filter changes
 * the order they slide to their new places instead of jumping.
 */
export function Standings({ rows }: { rows: StandingView[] }) {
  return (
    <div role="table" aria-label={t.overview.byOpponent} className="text-sm">
      <div role="row" className="grid grid-cols-[2rem_minmax(0,1fr)_4.5rem_4.5rem] gap-3 border-b border-border pb-2">
        <span role="columnheader" className={head}>
          <span className="sr-only">{t.overview.standings.position}</span>#
        </span>
        <span role="columnheader" className={head}>{t.overview.standings.cls}</span>
        <span role="columnheader" className={cn(head, "text-right")}>{t.overview.standings.record}</span>
        <span role="columnheader" className={cn(head, "text-right")}>{t.overview.standings.winRate}</span>
      </div>
      <LayoutGroup>
        <div role="rowgroup">
          {rows.map((r, i) => (
            <motion.div
              key={r.cls}
              layout="position"
              transition={layoutSpring}
              role="row"
              title={t.overview.n(formatNumber(r.n))}
              className={cn(
                "glow-hover grid grid-cols-[2rem_minmax(0,1fr)_4.5rem_4.5rem] items-center gap-x-3 gap-y-1 rounded-xs border-b border-hairline py-2 last:border-0",
                r.lowSample && "opacity-55",
              )}
            >
              <span role="cell" className="stat text-base font-bold text-muted-foreground">
                {i + 1}
              </span>
              <span role="cell" className="flex min-w-0 items-center gap-2">
                <span className="h-3.5 w-1 shrink-0 rounded-full" style={{ background: classColor(r.cls) }} aria-hidden />
                <span className="truncate">{r.label}</span>
              </span>
              <span role="cell" className="stat text-right text-base text-muted-foreground">
                {formatNumber(r.wins)}–{formatNumber(r.losses)}
              </span>
              <span role="cell" className={cn("stat text-right text-lg font-bold", r.rate >= 0.5 ? "text-win" : "text-loss")}>
                {formatPercent(r.rate)}
              </span>
              <span className="col-start-2 col-end-5">
                <FiftyBar rate={r.rate} />
              </span>
            </motion.div>
          ))}
        </div>
      </LayoutGroup>
    </div>
  );
}

/** Decks ranked by how sure we are of the win rate (Wilson lower bound). */
export function DeckStandings({ rows }: { rows: DeckView[] }) {
  return (
    <ul className="grid gap-1">
      {rows.map((d) => (
        <motion.li
          key={d.name}
          layout="position"
          transition={layoutSpring}
          className={cn("glow-hover grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-xs px-1 py-2", d.lowSample && "opacity-55")}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-3.5 w-1 shrink-0 rounded-full" style={{ background: classColor(d.cls) }} aria-hidden />
            <span className="truncate font-medium">{d.name}</span>
            <span className="stat text-muted-foreground">{t.overview.n(formatNumber(d.n))}</span>
          </span>
          <span className={cn("stat text-2xl leading-none font-bold", d.rate >= 0.5 ? "text-win" : "text-loss")}>
            {formatPercent(d.rate)}
          </span>
          <span className="col-span-2">
            <FiftyBar rate={d.rate} />
          </span>
        </motion.li>
      ))}
    </ul>
  );
}
