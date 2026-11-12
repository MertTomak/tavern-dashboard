"use client";

import { AnimatePresence, motion } from "motion/react";
import { useNewIds } from "@/components/motion/use-new-ids";
import { DURATION, EASE_SNAP, layoutSpring } from "@/components/motion/timing";
import { classColor } from "@/lib/cards/class-colors";
import { t } from "@/i18n";
import { ResultChip } from "./ResultMark";
import type { RecentGameView } from "./overview-view";

/** Lower-third strip of the latest games, newest first. A live addition slides in with a brass flash. */
export function Ticker({ games }: { games: RecentGameView[] }) {
  const fresh = useNewIds(games.map((g) => g.id));
  return (
    <section aria-label={t.overview.recent} className="flex items-stretch overflow-hidden rounded-lg border border-border bg-sunken">
      <h2 className="stat flex shrink-0 items-center bg-primary py-2 pr-6 pl-4 text-base font-bold tracking-[0.06em] text-primary-foreground uppercase [clip-path:polygon(0_0,100%_0,calc(100%-12px)_100%,0_100%)]">
        {t.overview.recent}
      </h2>
      <ol className="relative flex min-w-0 items-center gap-2 overflow-x-auto px-3 py-2">
        <AnimatePresence initial={false} mode="popLayout">
          {games.map((g) => (
            <motion.li
              key={g.id}
              layout
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ ...layoutSpring, opacity: { duration: DURATION.base, ease: EASE_SNAP } }}
              className="glow-hover relative flex shrink-0 items-center gap-2 rounded-xs px-2 py-1 text-sm whitespace-nowrap"
            >
              {fresh.has(g.id) && (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-xs bg-primary/25"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1.4, ease: "easeOut" }}
                />
              )}
              <ResultChip result={g.result} />
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: classColor(g.opponentClass) }} aria-hidden />
                {t.overview.vs(g.opponent)}
              </span>
              <span className="stat text-muted-foreground">{g.when}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
}
