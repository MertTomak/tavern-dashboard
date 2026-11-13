"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { ArtCrop } from "./ArtCrop";
import type { ClassStanding } from "./types";
import { useChapter } from "./journey/reveal";
import { SCENE } from "@/components/motion/timing";

/** Glow strength grows with distance from 50%, in the result colour. */
function glow(rate: number, low: boolean) {
  if (low) return "none";
  const strength = Math.min(1, Math.abs(rate - 0.5) * 5);
  const c = rate >= 0.5 ? "var(--win)" : "var(--loss)";
  return `0 0 0 2px color-mix(in oklab, ${c} ${Math.round(40 + strength * 60)}%, transparent), 0 0 ${Math.round(8 + strength * 22)}px color-mix(in oklab, ${c} ${Math.round(strength * 70)}%, transparent)`;
}

function Pin({ label, value, className, tone }: { label: string; value: string; className: string; tone?: "win" | "loss" }) {
  return (
    <div className={cn("absolute flex items-center gap-2", className)}>
      <span className="size-2 rounded-full bg-brass-light shadow-[0_0_10px_#fbe3a4]" aria-hidden />
      <span className="h-px w-8 bg-brass-light/70" aria-hidden />
      <span className="brass-frame rounded-sm px-3 py-1.5 [--frame-fill:#120d0ae6]">
        <span className="stat block text-[10px] tracking-[0.14em] text-brass-dim uppercase">{label}</span>
        <span className={cn("stat block text-xl leading-none font-bold", tone === "win" ? "text-win" : tone === "loss" ? "text-loss" : "text-parchment")}>
          {value}
        </span>
      </span>
    </div>
  );
}

/**
 * Matchups as a hero-select screen. Round portraits glow in the result colour;
 * the selected class opens as a large image with its stats pinned on it.
 */
export function HeroSelect({ classes, totalGames }: { classes: ClassStanding[]; totalGames: number }) {
  const [selected, setSelected] = useState(classes[0]?.cls ?? "");
  const { revealed } = useChapter();
  const sel = classes.find((c) => c.cls === selected) ?? classes[0];
  if (!sel) return null;
  const good = sel.rate >= 0.5;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <ul className="grid grid-cols-3 content-start gap-x-3 gap-y-5 sm:grid-cols-4 xl:grid-cols-6" aria-label={t.concepts.matchups}>
        {classes.map((c, i) => {
          const active = c.cls === sel.cls;
          return (
            // Portraits light up one after another as the chapter arrives.
            <motion.li
              key={c.cls}
              initial={{ opacity: 0.25, filter: "brightness(0.3)" }}
              animate={revealed ? { opacity: 1, filter: "brightness(1)" } : undefined}
              transition={{ delay: i * SCENE.step, duration: 0.3, ease: [0.2, 0, 0, 1] }}
            >
              <button
                type="button"
                onClick={() => setSelected(c.cls)}
                aria-pressed={active}
                aria-label={t.concepts.selectClass(c.label)}
                className="group flex w-full flex-col items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <motion.span
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                  className={cn("relative block aspect-square w-[min(100%,104px)] overflow-hidden rounded-full", c.lowSample && "opacity-55")}
                  style={{ boxShadow: glow(c.rate, c.lowSample) }}
                >
                  <ArtCrop cardId={c.art} alt="" focus="face" zoom={1.25} />
                  {active && (
                    <motion.span
                      layoutId="hero-select-ring"
                      className="absolute inset-0 rounded-full ring-[3px] ring-brass-light ring-inset"
                      transition={{ type: "spring", bounce: 0, visualDuration: 0.3 }}
                    />
                  )}
                </motion.span>
                <span className="text-center leading-tight">
                  <span className={cn("block text-sm", active ? "text-brass-light" : "text-parchment")}>{c.label}</span>
                  <span className={cn("stat block text-lg font-bold", c.rate >= 0.5 ? "text-win" : "text-loss")}>{formatPercent(c.rate)}</span>
                  <span className="stat block text-xs text-ink-muted">{t.overview.n(formatNumber(c.n))}</span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>

      <section aria-label={t.concepts.pinned(sel.label)} className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={sel.cls}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="brass-frame brass-studs relative mx-auto aspect-[3/4] w-full max-w-[calc((100dvh-var(--chrome-h)-230px)*0.75)] min-w-[260px] overflow-hidden rounded-lg [--frame-fill:#120d0a]"
          >
            <ArtCrop cardId={sel.art} alt={sel.label} focus="center" />
            <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,#120d0af0)]" />
            <Pin label={t.concepts.matchups} value={sel.label} className="top-[8%] left-[6%]" />
            <Pin label={t.overview.standings.winRate} value={formatPercent(sel.rate)} className="top-[30%] right-[6%] flex-row-reverse" tone={good ? "win" : "loss"} />
            <Pin label={t.concepts.record} value={`${formatNumber(sel.wins)}–${formatNumber(sel.losses)}`} className="bottom-[22%] left-[6%]" />
            <Pin label={t.concepts.share} value={formatPercent(totalGames ? sel.n / totalGames : 0)} className="bottom-[7%] right-[6%] flex-row-reverse" />
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
