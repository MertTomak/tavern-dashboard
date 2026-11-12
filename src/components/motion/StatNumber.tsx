"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { DURATION, EASE_SNAP } from "./timing";

export type StatKind = "percent" | "number" | "duration";

const FORMAT: Record<StatKind, (v: number) => string> = {
  percent: (v) => formatPercent(v),
  number: (v) => formatNumber(Math.round(v)),
  duration: (v) => formatDuration(Math.round(v)),
};

type Props = { value: number; kind: StatKind; className?: string };

/**
 * A stat that counts up on first paint, then flips digit by digit like a
 * scoreboard when the value changes (for example after a live update).
 * An invisible copy of the final text reserves the width, so nothing shifts.
 */
export function StatNumber({ value, kind, className }: Props) {
  const reduce = useReducedMotion();
  const format = FORMAT[kind];
  const [counted, setCounted] = useState(false);
  const mv = useMotionValue(0);
  const text = useTransform(() => format(mv.get()));

  useEffect(() => {
    if (counted) return;
    const controls = animate(mv, value, {
      duration: reduce ? 0 : DURATION.count,
      ease: EASE_SNAP,
      onComplete: () => setCounted(true),
    });
    return () => controls.stop();
  }, [counted, mv, reduce, value]);

  const final = format(value);
  return (
    <span className={`relative inline-grid ${className ?? ""}`}>
      <span aria-hidden className="invisible [grid-area:1/1]">
        {final}
      </span>
      <span className="sr-only">{final}</span>
      <span aria-hidden className="[grid-area:1/1]">
        {counted ? <DigitFlip text={final} /> : <motion.span>{text}</motion.span>}
      </span>
    </span>
  );
}

/** Each character sits in its own clipped slot; a changed character rolls in from below. */
function DigitFlip({ text }: { text: string }) {
  const chars = [...text];
  return (
    <span className="inline-flex">
      {chars.map((ch, i) => {
        const slot = chars.length - i; // key from the right so units and decimals stay put
        return (
          <span key={slot} className="relative inline-grid overflow-hidden">
            <AnimatePresence initial={false}>
              <motion.span
                key={ch}
                className="[grid-area:1/1]"
                initial={{ y: "0.9em", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-0.9em", opacity: 0 }}
                transition={{ duration: DURATION.base, ease: EASE_SNAP }}
              >
                {ch === " " ? " " : ch}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
}
