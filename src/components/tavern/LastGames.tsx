"use client";

import { useNewIds } from "@/components/motion/use-new-ids";
import { t } from "@/i18n";
import { VersusCard } from "./VersusCard";
import { useJourneyEnabled } from "./journey/reveal";
import type { GameCard } from "./types";

/** The latest games as dealt cards, newest first. A game added by a live update flashes brass. */
export function LastGames({ games }: { games: GameCard[] }) {
  const fresh = useNewIds(games.map((g) => g.id));
  // A scrolling row scrolls natively; in the journey the cards wrap and nothing scrolls inside.
  const journey = useJourneyEnabled();
  return (
    <ol
      aria-label={t.concepts.lastGames}
      data-lenis-prevent={journey ? undefined : true}
      className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pt-1 pb-2 [mask-image:linear-gradient(to_right,black_92%,transparent)] journey:flex-wrap journey:justify-center journey:overflow-visible journey:[mask-image:none]"
    >
      {games.map((g, i) => (
        <VersusCard key={g.id} game={g} index={i} fresh={fresh.has(g.id)} />
      ))}
    </ol>
  );
}
