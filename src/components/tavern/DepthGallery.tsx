"use client";

import { useEffect, useState } from "react";
import { motion, useTransform } from "motion/react";
import { DURATION, SCENE, EASE_SNAP } from "@/components/motion/timing";
import { t } from "@/i18n";
import { VersusFace } from "./VersusCard";
import { useChapter } from "./journey/reveal";
import { useLean } from "./journey/velocity";
import type { GameCard } from "./types";

/**
 * Where each game floats, newest first: x and y from the centre (-1 … 1 of the
 * free space) and depth in px. Newer games sit nearer, so the sharpest card is
 * always the latest result; older ones recede into the dark.
 */
const SLOTS: readonly [number, number, number][] = [
  [-0.04, 0.08, 150],
  [0.36, -0.14, 70],
  [-0.4, -0.2, 20],
  [0.62, 0.26, -50],
  [-0.68, 0.24, -110],
  [0.1, -0.5, -170],
  [-0.22, 0.6, -230],
  [0.86, -0.42, -290],
  [-0.9, -0.5, -350],
  [0.42, 0.62, -410],
];
const NEAREST = SLOTS[0]?.[2] ?? 0;
const FARTHEST = SLOTS[SLOTS.length - 1]?.[2] ?? -1;
/** How far the whole space travels sideways across the chapter's scroll (px at depth 0). */
const TRAVEL = 260;
/** Blur and dimming of the farthest card; nearer ones get less. */
const MAX_BLUR = 2.2;
const MAX_DIM = 0.4;
/** Depth a hovered or focused card comes forward to. */
const FRONT = 260;
/** Perspective distance (px); far cards are spread wider so perspective does not bunch them in the middle. */
const PERSPECTIVE = 1100;
const SHARP = "blur(0px) brightness(1)";

function depthLook(z: number) {
  const far = (NEAREST - z) / (NEAREST - FARTHEST); // 0 nearest … 1 farthest
  return { blur: far * MAX_BLUR, dim: 1 - far * MAX_DIM };
}

/**
 * The last games as cards floating at different depths in a dark space
 * (CSS 3D perspective). Scrolling moves the space sideways and the perspective
 * turns that into depth parallax: near cards travel further and stay sharp, far
 * ones are smaller, dimmer and slightly blurred. Hover or focus brings a card forward.
 */
export function DepthGallery({ games, fresh, blur = true }: { games: GameCard[]; fresh: ReadonlySet<string>; blur?: boolean }) {
  const { revealed, drift } = useChapter();
  const worldX = useTransform(drift, (o) => o * TRAVEL);
  const lean = useLean(0.6);
  // The deal is staggered once; afterwards (hover out, live updates) cards move without delay.
  const [dealt, setDealt] = useState(false);
  useEffect(() => {
    if (!revealed) return;
    const id = setTimeout(() => setDealt(true), (SLOTS.length * SCENE.step + SCENE.reveal) * 1000);
    return () => clearTimeout(id);
  }, [revealed]);
  return (
    <motion.div style={{ ...lean, ["--persp" as string]: `${PERSPECTIVE}px` }} className="relative h-[clamp(320px,calc(100dvh-var(--chrome-h)-250px),580px)] [perspective:var(--persp)]">
      <div aria-hidden className="absolute inset-0 rounded-md bg-oak-deep bg-[radial-gradient(ellipse_65%_60%_at_50%_45%,transparent,rgba(0,0,0,0.7))]" />
      <motion.ol aria-label={t.concepts.lastGames} className="absolute inset-0 [transform-style:preserve-3d]" style={{ x: worldX }}>
        {games.slice(0, SLOTS.length).map((g, i) => {
          const [sx, sy, z] = SLOTS[i] ?? [0, 0, 0];
          const spread = 1 - z / PERSPECTIVE; // undo the perspective pull toward the centre
          const look = depthLook(z);
          const rest = `blur(${blur ? look.blur.toFixed(2) : 0}px) brightness(${look.dim.toFixed(2)})`;
          return (
            <motion.li
              key={g.id}
              tabIndex={0}
              aria-label={`${t.overview.result[g.result]} ${t.overview.vs(g.oppLabel)}, ${g.when}`}
              className="absolute w-[136px] rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ left: `calc(50% + ${(sx * spread).toFixed(3)} * (50% - 84px) - 68px)`, top: `calc(50% + ${(sy * spread).toFixed(3)} * (50% - 96px) - 85px)` }}
              initial={{ opacity: 0, z: z - 320, filter: rest }}
              animate={
                revealed
                  ? { opacity: 1, z, filter: rest, transition: { delay: dealt || fresh.has(g.id) ? 0 : i * SCENE.step, duration: SCENE.reveal, ease: EASE_SNAP } }
                  : undefined
              }
              whileHover={{ z: FRONT, filter: SHARP }}
              whileFocus={{ z: FRONT, filter: SHARP }}
              transition={{ duration: DURATION.slow, ease: EASE_SNAP }}
            >
              <motion.div
                style={{ transformPerspective: 800 }}
                initial={{ rotateY: 90 }}
                animate={revealed ? { rotateY: 0 } : undefined}
                transition={{ delay: fresh.has(g.id) ? 0 : i * SCENE.step, duration: 0.35, ease: EASE_SNAP }}
              >
                <VersusFace game={g} fresh={fresh.has(g.id)} />
              </motion.div>
            </motion.li>
          );
        })}
      </motion.ol>
    </motion.div>
  );
}
