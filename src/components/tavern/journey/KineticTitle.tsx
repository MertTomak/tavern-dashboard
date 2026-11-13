"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { SCENE, EASE_SNAP } from "@/components/motion/timing";
import { useChapter } from "./reveal";
import { useLean } from "./velocity";
import { useEffects } from "./effects";

/** How far the title bends while its panel is off centre: lift of the ends (em) and tilt of the outer letters (deg). */
const BEND_LIFT = 0.32;
const BEND_TILT = 9;
/** Delay between letters as the title reveals. */
const LETTER_STEP = 0.028;

function Letter({ char, u, offset, index, revealed, bend }: { char: string; u: number; offset: MotionValue<number>; index: number; revealed: boolean; bend: number }) {
  // An arc through the letters: flat when the panel is centred (offset 0), bowed while it moves.
  const y = useTransform(offset, (o) => `${Math.max(-1, Math.min(1, o)) * bend * BEND_LIFT * (u * u - 0.35)}em`);
  const rotate = useTransform(offset, (o) => Math.max(-1, Math.min(1, o)) * bend * BEND_TILT * u);
  return (
    <motion.span className="inline-block origin-bottom will-change-transform" style={{ y, rotate }}>
      <motion.span
        className="inline-block"
        initial={{ opacity: 0, y: "0.55em", rotateX: -80 }}
        animate={revealed ? { opacity: 1, y: 0, rotateX: 0 } : undefined}
        transition={{ delay: index * LETTER_STEP, duration: SCENE.reveal * 0.7, ease: EASE_SNAP }}
      >
        {char === " " ? " " : char}
      </motion.span>
    </motion.span>
  );
}

/**
 * A chapter title set very large in the display font. It deals in letter by
 * letter as its chapter arrives, bows along a gentle curve while the journey
 * moves, settles flat when the chapter is centred, and leans with scroll speed.
 * Screen readers get the plain text once.
 */
export function KineticTitle({ text }: { text: string }) {
  const { revealed, offset } = useChapter();
  const lean = useLean(0.7);
  const bend = useEffects().motion ? 1 : 0;
  // Words stay unbroken; every letter keeps its index in the whole title for the arc and the stagger.
  const words = text.split(" ").reduce<{ chars: { c: string; i: number }[] }[]>((acc, word, w, all) => {
    const start = acc.reduce((sum, x) => sum + x.chars.length, 0);
    const chars = Array.from(w < all.length - 1 ? `${word} ` : word).map((c, k) => ({ c, i: start + k }));
    return [...acc, { chars }];
  }, []);
  const last = Math.max(1, Array.from(text).length - 1);
  return (
    <motion.h2
      style={lean}
      className="origin-bottom-left font-display text-[clamp(2.5rem,min(7vw,11dvh),6.5rem)] leading-[0.95] font-semibold tracking-tight text-title-gold [font-variation-settings:'opsz'_144,'SOFT'_50] [perspective:600px] [text-shadow:0_4px_28px_rgba(0,0,0,0.7)]"
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, w) => (
          <span key={w} className="inline-block whitespace-nowrap">
            {word.chars.map(({ c, i }) => (
              <Letter key={i} char={c} u={(i / last) * 2 - 1} offset={offset} index={i} revealed={revealed} bend={bend} />
            ))}
          </span>
        ))}
      </span>
    </motion.h2>
  );
}
