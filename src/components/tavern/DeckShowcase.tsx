"use client";

import { useState } from "react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { DeckHand } from "./DeckHand";
import { DeckWall } from "./DeckWall";
import type { DeckStanding } from "./types";

type View = "fan" | "wall";

/**
 * "Your hand" with a choice of view: the fanned hand (default) or the hall of
 * decks on a curved wall. Phones always get the swipeable row inside DeckHand.
 */
export function DeckShowcase({ decks }: { decks: DeckStanding[] }) {
  const [view, setView] = useState<View>("fan");
  const views: { id: View; label: string }[] = [
    { id: "fan", label: t.concepts.handFan },
    { id: "wall", label: t.concepts.handWall },
  ];
  return (
    <>
      <div role="radiogroup" aria-label={t.concepts.handView} className="absolute top-5 right-5 hidden rounded-full border border-brass/30 bg-oak-deep/80 p-0.5 sm:flex md:top-6 md:right-6">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={view === v.id}
            onClick={() => setView(v.id)}
            className={cn(
              "stat rounded-full px-3 py-1 text-xs tracking-[0.08em] uppercase outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring",
              view === v.id ? "bg-brass-light text-oak" : "text-ink-muted hover:text-parchment",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
      {view === "wall" ? (
        <>
          <div className="hidden sm:block">
            <DeckWall decks={decks} />
          </div>
          <div className="sm:hidden">
            <DeckHand decks={decks} />
          </div>
        </>
      ) : (
        <DeckHand decks={decks} />
      )}
    </>
  );
}
