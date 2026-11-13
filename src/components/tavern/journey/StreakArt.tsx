"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { ArtCrop } from "../ArtCrop";
import { clamp } from "./geometry";

/** Columns the art splits into while it forms, and how far a column stretches at most. */
const COLUMNS = 16;
const MAX_STRETCH = 5;
/** Fixed per-column lag (0 … 1), so the columns settle unevenly like the melt that came before. */
const LAG = Array.from({ length: COLUMNS }, (_, i) => {
  const x = Math.sin(i * 91.7 + 13.1) * 43758.5453;
  return x - Math.floor(x);
});

/**
 * Columns are drawn without filters: a blurred or graded layer is re-rasterised
 * on every stretch and cost ~10 ms a frame. Opacity alone gives the same dim
 * look on the dark stage, and streaks are soft by nature.
 */
const COLUMN_LOOK = "scale-125 opacity-[0.22]";

function Column({ cardId, index, form }: { cardId: string; index: number; form: MotionValue<number> }) {
  const lag = LAG[index] ?? 0;
  const scaleY = useTransform(form, (f) => 1 + clamp(f * 1.3 - lag * 0.3, 0, 1) ** 2 * MAX_STRETCH);
  return (
    <div className="absolute inset-y-0 overflow-hidden" style={{ left: `${(index / COLUMNS) * 100}%`, width: `${100 / COLUMNS}%` }}>
      <motion.div className="absolute inset-y-0 origin-top will-change-transform" style={{ left: `-${index * 100}%`, width: `${COLUMNS * 100}%`, scaleY }}>
        <ArtCrop cardId={cardId} className={COLUMN_LOOK} />
      </motion.div>
    </div>
  );
}

/**
 * Chapter art that forms back from vertical streaks, answering the hero card's
 * melt: `form` 1 = fully streaked, 0 = whole. While forming, the art is split
 * into columns that each un-stretch at their own pace (transforms only); at rest
 * it is a single image again, so there are no seams.
 */
export function StreakArt({ cardId, className, form }: { cardId: string; className?: string; form: MotionValue<number> }) {
  const [forming, setForming] = useState(form.get() > 0.001);
  useMotionValueEvent(form, "change", (f) => setForming(f > 0.001));
  if (!forming) return <ArtCrop cardId={cardId} className={className} />;
  return (
    <div className="relative size-full">
      {LAG.map((_, i) => (
        <Column key={i} cardId={cardId} index={i} form={form} />
      ))}
    </div>
  );
}
