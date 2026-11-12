"use client";

import { motion } from "motion/react";
import { StatNumber } from "@/components/motion/StatNumber";
import { useNewIds } from "@/components/motion/use-new-ids";
import { DURATION, EASE_SNAP } from "@/components/motion/timing";
import { cn } from "@/lib/utils";
import { portraitSrc } from "@/lib/cards/art";
import { ArtImage } from "@/components/cards/CardArt";
import { t } from "@/i18n";
import { RESULT_TEXT } from "./ResultMark";
import type { RecentGameView, ScoreboardView } from "./overview-view";

const label = "stat text-sm font-medium tracking-[0.08em] text-muted-foreground uppercase";

/** Carved tally marks for the last games, oldest to newest. A new game rolls in with a brass flash. */
export function Tally({ form }: { form: RecentGameView[] }) {
  const fresh = useNewIds(form.map((g) => g.id));
  return (
    <ol aria-label={t.overview.form} className="flex gap-1.5">
      {form.map((g) => {
        const isNew = fresh.has(g.id);
        return (
          <motion.li
            key={g.id}
            layout="position"
            initial={isNew ? { opacity: 0, y: -10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.slow, ease: EASE_SNAP }}
            title={`${t.overview.result[g.result]} ${t.overview.vs(g.opponent)}, ${g.when}`}
            className={cn(
              "glow-hover stat relative flex h-11 w-7 items-end justify-center rounded-[5px] border pb-1 text-sm font-bold",
              g.result === "WIN" && "border-win/45 bg-linear-to-t from-win/25 to-transparent",
              g.result === "LOSS" && "border-loss/45 bg-linear-to-t from-loss/25 to-transparent",
              g.result === "TIE" && "border-tie/45 bg-linear-to-t from-tie/20 to-transparent",
              RESULT_TEXT[g.result],
            )}
          >
            {t.overview.resultShort[g.result]}
            <span className="sr-only">
              {t.overview.result[g.result]} {t.overview.vs(g.opponent)}
            </span>
            {isNew && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-[5px] shadow-glow"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}

/** Broadcast-style score band in Hearth colours: win rate + form, W–L, last 7 days, streak, average game. */
export function Scoreboard({ view }: { view: ScoreboardView }) {
  return (
    <section
      aria-label={t.overview.winRate}
      className="@container overflow-hidden rounded-lg border border-border bg-card shadow-panel"
    >
      <div className="grid @xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] @5xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)_minmax(0,1.6fr)]">
      <div className="relative overflow-hidden bg-linear-115 from-primary/16 via-primary/5 to-transparent p-5">
        {view.mainClass && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-3/4 [mask-image:linear-gradient(to_right,transparent,black_55%,black_80%,transparent)]"
          >
            <ArtImage
              src={portraitSrc(view.mainClass)}
              alt=""
              width={512}
              height={512}
              className="absolute inset-0 size-full bg-transparent"
              imgClassName="object-[50%_25%] opacity-20 saturate-[0.8] dark:opacity-[0.22]"
              fallback={null}
              priority
            />
          </span>
        )}
        <p className={cn(label, "relative")}>{t.overview.winRate}</p>
        <p
          data-celebrate-anchor
          className="relative mt-1 w-fit font-display text-[clamp(3.75rem,7vw,6rem)] leading-[0.9] font-semibold text-brass-bright [font-variation-settings:'opsz'_144,'SOFT'_100]"
        >
          <span aria-hidden className="pointer-events-none absolute -inset-x-6 -inset-y-4 rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)]" />
          <StatNumber value={view.winRate} kind="percent" className="relative [font-variant-numeric:lining-nums_tabular-nums]" />
        </p>
        <p className="relative mt-2 mb-4 text-sm text-muted-foreground">{view.games}</p>
        <div className="relative">
          <Tally form={view.form} />
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-border p-5 @xl:border-t-0 @xl:border-l">
        <div>
          <p className={label}>{t.overview.winsLabel}</p>
          <p className="stat text-6xl leading-none font-bold text-win">
            <StatNumber value={view.wins} kind="number" />
          </p>
        </div>
        <span aria-hidden className="stat pt-5 text-4xl text-muted-foreground">
          –
        </span>
        <div>
          <p className={label}>{t.overview.lossesLabel}</p>
          <p className="stat text-6xl leading-none font-bold text-loss">
            <StatNumber value={view.losses} kind="number" />
          </p>
        </div>
      </div>

      <dl className="grid border-t border-border @xl:col-span-2 @xl:grid-cols-3 @5xl:col-span-1 @5xl:border-t-0 @5xl:border-l">
        <div className="p-5">
          <dt className={label}>{t.overview.last7}</dt>
          <dd className="stat mt-1 text-4xl leading-none font-bold">
            {view.last7 === null ? "–" : <StatNumber value={view.last7} kind="percent" />}
          </dd>
          <dd className={cn("mt-1.5 text-sm", view.last7 === null ? "text-muted-foreground" : view.deltaUp ? "text-win" : "text-loss")}>
            {view.delta}
          </dd>
        </div>
        <div className="border-t border-border p-5 @xl:border-t-0 @xl:border-l">
          <dt className={label}>{t.overview.streak}</dt>
          <dd className={cn("stat mt-1 text-4xl leading-none font-bold", view.streakResult && RESULT_TEXT[view.streakResult])}>
            {view.streak}
          </dd>
        </div>
        <div className="border-t border-border p-5 @xl:border-t-0 @xl:border-l">
          <dt className={label}>{t.overview.avgLength}</dt>
          <dd className="stat mt-1 text-4xl leading-none font-bold">
            {view.avgDurationSec === null ? "–" : <StatNumber value={view.avgDurationSec} kind="duration" />}
          </dd>
        </div>
      </dl>
      </div>
    </section>
  );
}
