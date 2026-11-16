"use client";

import { Layers } from "lucide-react";
import { formatPercent } from "@/lib/format";
import { DECK_SIZES } from "@/lib/tracker/layout";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { DeckPicker } from "./DeckPicker";
import { PanelShell } from "./PanelShell";
import { DeckCardRow } from "./TrackerRows";
import { useFitRows, type TrackerState } from "./use-tracker";

/**
 * My deck, on the right edge: every card of the list by mana cost with the
 * copies still in the deck. The rows share the panel's full height (within the
 * S / M / L size), so the tile, mana gem, name and ×count stay readable.
 * Drawn cards count down; a card with none left dims. On top: cards left and
 * the chance the next draw is a card with one or two copies left.
 */
export function DeckPanel({ tracker }: { tracker: TrackerState }) {
  const copy = t.tracker;
  const { view, visible, deckSize, setDeckSize } = tracker;
  const { me, deck } = view;
  const listed = deck.source !== "seen";
  const copiesLeft = [...new Set(me.rows.map((r) => r.left ?? 0).filter((n) => n > 0))].sort((a, b) => a - b);
  const [measureList, listStyle] = useFitRows(me.rows.length, deckSize);

  return (
    <PanelShell
      panel="deck"
      fill
      visible={visible}
      heading={
        <span className="min-w-0">
          <span className="block truncate font-display text-[15px] leading-tight text-title-gold">{deck.name ?? copy.myDeck}</span>
          <span className="block truncate text-[10.5px] leading-tight text-ink-muted">
            {view.status === "over" ? copy.gameOver : copy.turn(view.turn)} · {copy.deckSources[deck.source]}
          </span>
        </span>
      }
      aside={
        <p className="flex shrink-0 items-baseline gap-1" aria-label={copy.cardsLeft(me.deckCount)}>
          <Layers aria-hidden className="size-3.5 self-center text-brass" />
          <span className="stat text-2xl leading-none font-bold text-brass-bright">{me.deckCount}</span>
        </p>
      }
      controls={
        <span role="radiogroup" aria-label={copy.size} className="flex overflow-hidden rounded-xs border border-brass/35">
          {DECK_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={size === deckSize}
              aria-label={copy.sizes[size]}
              title={copy.sizes[size]}
              onClick={() => setDeckSize(size)}
              className={cn(
                "stat grid h-5 w-5 place-items-center text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring",
                size === deckSize ? "bg-brass/85 text-oak-deep" : "text-ink-muted hover:text-parchment",
              )}
            >
              {copy.sizeShort[size]}
            </button>
          ))}
        </span>
      }
    >
      {view.status === "waiting" ? (
        <p className="px-1 text-[12px] text-ink-muted">{copy.waiting}</p>
      ) : (
        <>
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
          {deck.source !== "code" && me.cls && view.status === "playing" && <DeckPicker cls={me.cls} source={deck.source} />}

          <ul
            ref={measureList}
            data-lenis-prevent
            aria-label={copy.myDeck}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [scrollbar-width:none]"
            style={listStyle}
          >
            {me.rows.map((r) =>
              listed ? (
                <DeckCardRow
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
                <DeckCardRow key={r.cardId} cardId={r.cardId} name={r.name} cost={r.cost} badge={`${r.seen}`} badgeLabel={copy.seenCount(r.seen)} />
              ),
            )}
          </ul>
        </>
      )}
    </PanelShell>
  );
}
