"use client";

import { motion } from "motion/react";
import { ResultChip, RESULT_BG } from "@/components/dashboard/ResultMark";
import { classLabel } from "@/lib/cards/class-colors";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { ArtCrop } from "./ArtCrop";
import { useChapter } from "./journey/reveal";
import { SCENE } from "@/components/motion/timing";
import type { GameCard } from "./types";

type Props = { game: GameCard; index: number; fresh?: boolean };

/** The face of a game card: opponent art, my class badge, result chip and edge, and a brass flash when it is new. */
export function VersusFace({ game, fresh }: { game: GameCard; fresh?: boolean }) {
  return (
    <div
      className="brass-frame relative aspect-[4/5] overflow-hidden rounded-md [--frame-fill:#1c1410]"
      title={`${t.overview.result[game.result]} ${t.overview.vs(game.oppLabel)}, ${game.when}`}
    >
      <ArtCrop cardId={game.oppArt} focus="face" zoom={1.1} />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black/90 via-black/50 to-transparent" />
      <span className="absolute top-1.5 left-1.5 size-8 overflow-hidden rounded-full ring-2 ring-brass-light shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
        <ArtCrop cardId={game.myArt} alt={`${t.concepts.you}: ${classLabel(game.myClass)}`} focus="face" zoom={1.6} />
      </span>
      <ResultChip result={game.result} className="absolute top-2 right-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.6)]" />
      <span className="absolute inset-x-2 bottom-2.5 text-[11px] leading-tight text-white">
        <span className="block truncate font-semibold">{t.overview.vs(game.oppLabel)}</span>
        <span className="stat block text-white/75">{game.when}</span>
      </span>
      <span aria-hidden className={cn("absolute inset-x-0 bottom-0 h-1", RESULT_BG[game.result])} />
      {fresh && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-md shadow-glow"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      )}
    </div>
  );
}

/**
 * One game as a small card: the opponent's art fills it, my class sits as a
 * portrait badge in the corner, the result chip and a result-coloured edge
 * mark the outcome. Cards flip in like a dealt hand; a live addition flashes brass.
 */
export function VersusCard({ game, index, fresh }: Props) {
  const { revealed } = useChapter();
  return (
    <motion.li
      initial={{ rotateY: 90, y: -24, opacity: 0 }}
      animate={revealed ? { rotateY: 0, y: 0, opacity: 1 } : undefined}
      transition={{ delay: fresh ? 0 : index * SCENE.step, duration: 0.35, ease: [0.2, 0, 0, 1] }}
      style={{ transformPerspective: 800 }}
      className="w-[136px] shrink-0 snap-start"
    >
      <VersusFace game={game} fresh={fresh} />
    </motion.li>
  );
}
