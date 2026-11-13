"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { DURATION, EASE_SNAP, SCENE } from "@/components/motion/timing";
import { DeckCardFace, withPreview } from "./DeckHand";
import { useChapter } from "./journey/reveal";
import { clamp } from "./journey/geometry";
import { useEffects } from "./journey/effects";
import type { DeckStanding } from "./types";

const CARD_W = 150;
/** Wall radius (px) = perspective distance: the viewer stands at the centre of the curve. */
const RADIUS = 950;
/** Arc between neighbouring cards, in degrees. */
const STEP = ((CARD_W + 46) / RADIUS) * (180 / Math.PI);
/** Drift (share of a chapter's scroll) over which the walk covers the whole wall. */
const WALK = 0.45;

/**
 * "Your hand" as a hall of decks: the deck cards hang on a curved tavern wall
 * (CSS 3D, the viewer at the centre of the curve) and scrolling walks along it,
 * so each deck passes in front in turn. Cards far round the curve fade into the dark.
 */
export function DeckWall({ decks }: { decks: DeckStanding[] }) {
  const { revealed, drift } = useChapter();
  const mid = (decks.length - 1) / 2;
  const span = mid * STEP;
  // Scrolling on (drift falling) walks to the right: later decks come round to the front.
  const walking = useEffects().motion;
  const turn = useTransform(drift, (o) => (walking ? -clamp(o / WALK, -1, 1) * span : 0));
  const world = useTransform(turn, (a) => `translateZ(${RADIUS}px) rotateY(${a}deg)`);

  return (
    <div className="relative h-[300px] w-full overflow-hidden [perspective:950px]" aria-label={t.concepts.handWallLabel} role="group">
      {/* The wall: dark oak planks lit from the middle, with a brass rail the cards hang from. */}
      <div aria-hidden className="absolute inset-0 rounded-md bg-oak-deep bg-[repeating-linear-gradient(90deg,transparent_0_118px,rgba(0,0,0,0.35)_118px_120px),radial-gradient(ellipse_60%_80%_at_50%_40%,rgba(224,168,74,0.14),transparent_70%)]" />
      <div aria-hidden className="absolute inset-x-0 top-7 h-[3px] bg-[linear-gradient(90deg,transparent,#b07a2a_20%,#fbe3a4_50%,#b07a2a_80%,transparent)] opacity-70" />
      <motion.ol className="absolute top-12 left-1/2 [transform-style:preserve-3d]" style={{ transform: world, width: 0, height: 0 }}>
        {decks.map((d, i) => {
          const angle = (i - mid) * STEP;
          return <WallCard key={d.name} deck={d} angle={angle} turn={turn} index={i} revealed={revealed} />;
        })}
      </motion.ol>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--color-oak-deep),transparent_18%,transparent_82%,var(--color-oak-deep))]" />
    </div>
  );
}

function WallCard({ deck, angle, turn, index, revealed }: { deck: DeckStanding; angle: number; turn: MotionValue<number>; index: number; revealed: boolean }) {
  // How far round the curve the card is from the viewer's eye line; far ones fade.
  const opacity = useTransform(turn, (a) => 1 - clamp((Math.abs(a - angle) - 18) / 30, 0, 0.85));
  return (
    <motion.li
      className="absolute [backface-visibility:hidden]"
      style={{ width: CARD_W, marginLeft: -CARD_W / 2, transform: `rotateY(${-angle}deg) translateZ(${-RADIUS}px)`, opacity }}
    >
      <motion.div
        initial={{ y: -40, opacity: 0, rotate: -4 }}
        animate={revealed ? { y: 0, opacity: 1, rotate: 0, transition: { delay: index * SCENE.step, duration: SCENE.reveal, ease: EASE_SNAP } } : undefined}
        whileHover={{ y: -8 }}
        transition={{ duration: DURATION.slow, ease: EASE_SNAP }}
        className={cn("relative", deck.lowSample && "grayscale-[0.6] brightness-75")}
      >
        {/* The nail it hangs from. */}
        <span aria-hidden className="absolute -top-3 left-1/2 z-10 size-3 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fbe3a4,#7a5420)] shadow-[0_2px_4px_rgba(0,0,0,0.7)]" />
        {withPreview(
          deck,
          <div
            tabIndex={0}
            aria-label={`${deck.name}, ${formatPercent(deck.rate)}, ${t.overview.n(formatNumber(deck.n))}`}
            className="rounded-[14px] shadow-[0_18px_30px_rgba(0,0,0,0.6)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <DeckCardFace deck={deck} />
          </div>,
        )}
      </motion.div>
    </motion.li>
  );
}
