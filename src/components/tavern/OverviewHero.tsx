"use client";

import { motion, useTransform } from "motion/react";
import { Crown } from "lucide-react";
import { StatNumber } from "@/components/motion/StatNumber";
import { formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { ArtCrop } from "./ArtCrop";
import type { OverviewData, RankState } from "./types";
import { useChapter } from "./journey/reveal";
import { SCENE } from "@/components/motion/timing";

/** Plaques rise in one after another. */
function Rise({ index, children, className }: { index: number; children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.15 + index * SCENE.step,
        duration: 0.4,
        ease: [0.2, 0, 0, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

function Plaque({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="brass-frame brass-studs relative rounded-md px-4 py-3 backdrop-blur-md [--frame-fill:#140e0ad9]">
      <p className="stat text-xs tracking-[0.12em] text-brass-dim uppercase">{label}</p>
      <div className="stat mt-0.5 text-3xl leading-none font-bold text-parchment">{children}</div>
    </div>
  );
}

/** The whole ranked ladder in one bar: a segment per league, filled up to the current rank. */
function LadderBar({ rank }: { rank: RankState }) {
  const leagues = t.ranks.leagues;
  return (
    <div className="brass-frame relative rounded-md px-4 py-3 backdrop-blur-md [--frame-fill:#140e0ad9]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="stat text-xs tracking-[0.12em] text-brass-dim uppercase">{t.concepts.levelBar}</p>
        <p className="stat text-lg font-bold text-parchment">{rank.legend ? t.concepts.atLegend : t.concepts.toLegend(rank.label)}</p>
      </div>
      <div className="mt-2 flex h-2.5 gap-1" role="img" aria-label={`${t.concepts.levelBar}: ${formatPercent(rank.progress)}`}>
        {leagues.map((l, i) => {
          const fill = Math.max(0, Math.min(1, rank.index / 10 - i));
          return (
            <span key={l} className="relative flex-1 overflow-hidden rounded-sm bg-parchment/12">
              <motion.span
                className="absolute inset-0 origin-left bg-[linear-gradient(90deg,#b07a2a,#fbe3a4)]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: fill }}
                transition={{
                  delay: 0.3 + i * 0.1,
                  duration: 0.3,
                  ease: [0.2, 0, 0, 1],
                }}
              />
            </span>
          );
        })}
        <span className={cn("flex w-7 items-center justify-center rounded-sm", rank.legend ? "bg-brass-light" : "bg-parchment/12")}>
          <Crown className={cn("size-3", rank.legend ? "text-[#2b1a0a]" : "text-brass-dim")} aria-hidden />
        </span>
      </div>
      <div className="stat mt-1 flex text-[11px] text-ink-muted">
        {leagues.map((l) => (
          <span key={l} className="flex-1">
            {l}
          </span>
        ))}
        <span className="w-7 text-right">{t.ranks.legend}</span>
      </div>
    </div>
  );
}

/**
 * The featured legendary as the scene: a blurred, colour-graded copy fills the
 * width, the sharp art (512 px, the largest HearthstoneJSON offers) stands on the
 * right, and the win rate is set over it like a match result.
 */
export function OverviewHero({ data }: { data: OverviewData }) {
  // Depth while the journey moves on: the blurred scene drifts a little, the sharp art more.
  const { offset } = useChapter();
  const bgX = useTransform(offset, (o) => `${o * 10}%`);
  const artX = useTransform(offset, (o) => `${o * 34}%`);
  const f = data.featured;

  return (
    <section aria-label={t.overview.winRate} className="relative isolate overflow-hidden journey:h-full">
      {f && (
        <>
          <motion.div aria-hidden className="absolute -inset-10 -z-20" style={{ x: bgX }}>
            <ArtCrop cardId={f.id} className="scale-125 blur-2xl brightness-[0.5] saturate-[0.9]" />
          </motion.div>
          {/* Colour grade: oak shadows, ember highlights. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_70%_at_70%_30%,transparent,#120d0a_75%),linear-gradient(180deg,#e0782a22,#120d0a)] mix-blend-multiply"
          />
          <motion.div
            className="absolute top-0 right-0 bottom-0 -z-10 w-[min(560px,62%)] [mask-image:linear-gradient(to_right,transparent,black_30%),linear-gradient(to_top,transparent,black_30%)] [mask-composite:intersect]"
            style={{ x: artX }}
          >
            <ArtCrop cardId={f.id} alt={f.name} priority />
          </motion.div>
        </>
      )}

      <div className="mx-auto flex min-h-[min(72vh,600px)] max-w-[1180px] flex-col justify-end gap-5 px-4 pt-14 pb-12 md:px-8 journey:h-full journey:min-h-0 journey:pb-24">
        {f && (
          <p className="stat max-w-[60ch] text-sm tracking-[0.14em] text-brass-dim uppercase [text-shadow:0_1px_8px_#000]">
            {t.concepts.featured} · {f.name} · {t.concepts.featuredFrom(f.set)}
          </p>
        )}
        <div>
          <p className="text-sm text-brass-dim">
            {t.overview.winRate} · {data.rangeLabel}
          </p>
          <p
            data-celebrate-anchor
            className="w-fit font-display text-[clamp(4.5rem,13vw,10rem)] leading-[0.85] font-semibold tracking-tight [font-variation-settings:'opsz'_144,'SOFT'_100]"
          >
            <span className="bg-[linear-gradient(180deg,#fff3d0,#f0c36b_55%,#b07a2a)] bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
              <StatNumber value={data.winRate} kind="percent" className="[font-variant-numeric:lining-nums_tabular-nums]" />
            </span>
          </p>
          <p className="stat mt-2 text-xl text-parchment">
            <span className="text-win">{formatNumber(data.wins)}</span>
            <span className="mx-2 text-ink-muted">–</span>
            <span className="text-loss">{formatNumber(data.losses)}</span>
            <span className="ml-3 text-base text-ink-muted">{t.concepts.games(formatNumber(data.games))}</span>
          </p>
        </div>
        <div className="grid max-w-[760px] gap-3">
          <div className="grid grid-cols-3 gap-3">
            <Rise index={0}>
              <Plaque label={t.concepts.today}>
                {data.today.n ? (
                  <>
                    <span className="text-win">{data.today.wins}</span>
                    <span className="text-ink-muted">–</span>
                    <span className="text-loss">{data.today.losses}</span>
                  </>
                ) : (
                  <span className="text-base font-medium text-ink-muted">{t.concepts.todayNone}</span>
                )}
              </Plaque>
            </Rise>
            <Rise index={1}>
              <Plaque label={t.concepts.streak}>
                <span className={data.streak?.result === "WIN" ? "text-win" : "text-loss"}>
                  {data.streak ? (data.streak.result === "WIN" ? t.overview.streakWins(data.streak.length) : t.overview.streakLosses(data.streak.length)) : t.overview.noStreak}
                </span>
              </Plaque>
            </Rise>
            <Rise index={2}>
              <Plaque label={t.concepts.last7}>{data.last7.n ? formatPercent(data.last7.rate) : "–"}</Plaque>
            </Rise>
          </div>
          {data.rank && (
            <Rise index={3}>
              <LadderBar rank={data.rank} />
            </Rise>
          )}
        </div>
      </div>
    </section>
  );
}
