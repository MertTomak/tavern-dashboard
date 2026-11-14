"use client";

import { Layers } from "lucide-react";
import { formatPercent } from "@/lib/format";
import type { TrackerView } from "@/lib/tracker/view";
import { t } from "@/i18n";
import { TrackerCardRow } from "./TrackerRows";

/**
 * My deck: every card of the list by mana cost with the copies still in the
 * deck. Drawn cards count down; a card with none left dims. On top: cards
 * left and the chance the next draw is a card with one or two copies left.
 */
export function DeckPanel({ view }: { view: TrackerView }) {
  const copy = t.tracker;
  const { me, deck } = view;
  const listed = deck.source !== "seen";
  const copiesLeft = [...new Set(me.rows.map((r) => r.left ?? 0).filter((n) => n > 0))].sort((a, b) => a - b);

  return (
    <section aria-label={copy.myDeck} className="flex min-h-0 flex-1 flex-col gap-1.5">
      <header className="flex items-end justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <h2 className="truncate font-display text-[15px] leading-tight text-title-gold">{deck.name ?? copy.myDeck}</h2>
          <p className="truncate text-[10.5px] text-ink-muted">{copy.deckSources[deck.source]}</p>
        </div>
        <p className="flex shrink-0 items-baseline gap-1" aria-label={copy.cardsLeft(me.deckCount)}>
          <Layers aria-hidden className="size-3.5 self-center text-brass" />
          <span className="stat text-2xl leading-none font-bold text-brass-bright">{me.deckCount}</span>
          <span aria-hidden className="text-[10.5px] text-ink-muted">{copy.inDeck}</span>
        </p>
      </header>

      {listed && me.deckCount > 0 && copiesLeft.length > 0 && (
        <p className="flex items-center gap-2 rounded-xs border border-brass/20 bg-sunken/80 px-2 py-1 text-[11px]">
          <span className="text-ink-muted">{copy.nextDraw}</span>
          {copiesLeft.map((n) => {
            const chance = formatPercent(n / me.deckCount);
            return (
              <span key={n} className="stat text-[13px] text-parchment" aria-label={copy.nextDrawLabel(n, chance)}>
                <span className="text-brass-light">{copy.nextDrawCopies(n)}</span> {chance}
              </span>
            );
          })}
        </p>
      )}
      {!listed && <p className="rounded-xs border border-brass/20 bg-sunken/80 px-2 py-1 text-[11px] leading-snug text-ink-muted">{copy.seenOnly}</p>}

      <ul data-lenis-prevent className="flex min-h-0 flex-1 flex-col gap-[3px] overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin]">
        {me.rows.map((r) =>
          listed ? (
            <TrackerCardRow
              key={r.cardId}
              cardId={r.cardId}
              name={r.name}
              cost={r.cost}
              legendary={r.rarity === "LEGENDARY"}
              dimmed={r.left === 0}
              badge={r.left ? `×${r.left}` : undefined}
              badgeLabel={r.left ? copy.copiesLeft(r.left) : copy.noneLeft}
            />
          ) : (
            <TrackerCardRow key={r.cardId} cardId={r.cardId} name={r.name} cost={r.cost} badge={`${r.seen}`} badgeLabel={copy.seenCount(r.seen)} />
          ),
        )}
      </ul>
    </section>
  );
}
