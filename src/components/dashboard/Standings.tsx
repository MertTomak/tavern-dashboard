"use client";

import { LayoutGroup, motion } from "motion/react";
import { layoutSpring } from "@/components/motion/timing";
import { ClassPortrait } from "@/components/cards/ClassPortrait";
import { ArtImage } from "@/components/cards/CardArt";
import { CardPreview } from "@/components/cards/CardPreview";
import { artSrc } from "@/lib/cards/art";
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
                <ClassPortrait cls={r.cls} size={26} />
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

/** Darkened signature-card art behind the right side of a deck row; the text side stays solid. */
function DeckBanner({ cardId, name }: { cardId: string; name: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 right-16 w-1/2 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_45%,black_70%,transparent)]"
    >
      <ArtImage
        src={artSrc("art", cardId)}
        alt=""
        width={512}
        height={512}
        className="absolute inset-0 size-full bg-transparent"
        imgClassName="scale-[1.45] object-[50%_35%] opacity-30 saturate-[0.85] transition-[transform,opacity] duration-300 ease-snap group-hover:scale-[1.52] group-hover:opacity-45 group-focus-visible:opacity-45"
        fallback={null}
      />
      <span className="sr-only">{name}</span>
    </span>
  );
}

/** Decks ranked by how sure we are of the win rate (Wilson lower bound). Hover a row to see its signature card. */
export function DeckStandings({ rows }: { rows: DeckView[] }) {
  return (
    <ul className="grid gap-2">
      {rows.map((d) => {
        const row = (
          <div
            tabIndex={d.signature ? 0 : undefined}
            aria-label={d.signature ? `${d.name}, ${d.signature.name}` : undefined}
            className="group glow-hover relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 overflow-hidden rounded-md border border-hairline px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {d.signature && <DeckBanner cardId={d.signature.id} name={d.signature.name} />}
            <span className="relative flex min-w-0 items-center gap-2.5">
              <ClassPortrait cls={d.cls} size={30} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{d.name}</span>
                <span className="stat block text-sm text-muted-foreground">
                  {formatNumber(d.wins)}–{formatNumber(d.losses)} · {t.overview.n(formatNumber(d.n))}
                </span>
              </span>
            </span>
            <span className={cn("stat relative text-2xl leading-none font-bold", d.rate >= 0.5 ? "text-win" : "text-loss")}>
              {formatPercent(d.rate)}
            </span>
            <span className="relative col-span-2">
              <FiftyBar rate={d.rate} />
            </span>
          </div>
        );
        return (
          <motion.li key={d.name} layout="position" transition={layoutSpring} className={cn(d.lowSample && "opacity-55")}>
            {d.signature ? (
              <CardPreview cardId={d.signature.id} name={d.signature.name}>
                {row}
              </CardPreview>
            ) : (
              row
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}
