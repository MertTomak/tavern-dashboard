"use client";

import { motion } from "motion/react";
import { useNewIds } from "@/components/motion/use-new-ids";
import { t } from "@/i18n";
import { VersusCard } from "./VersusCard";
import { DepthGallery } from "./DepthGallery";
import { useJourneyEnabled } from "./journey/reveal";
import { useLean } from "./journey/velocity";
import type { GameCard } from "./types";

/**
 * The latest games, newest first: a depth gallery in the journey, a dealt row
 * that scrolls natively on the plain page. A game added by a live update flashes brass.
 */
export function LastGames({ games }: { games: GameCard[] }) {
  const fresh = useNewIds(games.map((g) => g.id));
  const journey = useJourneyEnabled();
  const lean = useLean();
  if (journey) return <DepthGallery games={games} fresh={fresh} />;
  return (
    <motion.ol
      style={lean}
      aria-label={t.concepts.lastGames}
      data-lenis-prevent
      className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pt-1 pb-2 [mask-image:linear-gradient(to_right,black_92%,transparent)]"
    >
      {games.map((g, i) => (
        <VersusCard key={g.id} game={g} index={i} fresh={fresh.has(g.id)} />
      ))}
    </motion.ol>
  );
}
