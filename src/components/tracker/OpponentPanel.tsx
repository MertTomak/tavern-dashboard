"use client";

import { useEffect, useMemo, useState } from "react";
import { Hand, Layers } from "lucide-react";
import { z } from "zod";
import { classLabel } from "@/lib/cards/class-colors";
import { classifyArchetype, type ArchetypeRule } from "@/lib/stats/archetypes";
import { t } from "@/i18n";
import { PanelShell } from "./PanelShell";
import { DeckCardRow, ManaGem } from "./TrackerRows";
import { useFitRows, type TrackerState } from "./use-tracker";

/** Height of the panel's header and padding: the part of the column that is not rows. */
const HEADER_PX = 64;

const rulesSchema = z.object({
  archetypes: z.array(z.object({ id: z.number(), name: z.string(), playerClass: z.string(), signatureCards: z.array(z.number()), minMatches: z.number() })),
});

/** The user's archetype rules for one class, fetched when the opponent's class becomes known. */
function useArchetypeRules(cls: string | null): ArchetypeRule[] {
  const [rules, setRules] = useState<ArchetypeRule[]>([]);
  useEffect(() => {
    if (!cls) return;
    let alive = true;
    fetch("/api/tracker/archetypes")
      .then((res) => res.json())
      .then((data: unknown) => alive && setRules(rulesSchema.parse(data).archetypes.filter((r) => r.playerClass === cls)))
      .catch(() => alive && setRules([]));
    return () => {
      alive = false;
    };
  }, [cls]);
  return rules;
}

/**
 * The opponent, in a column on the far left edge that looks exactly like my
 * deck panel: it starts empty and gains a row for every card they play or
 * reveal, copies grouped (×2), sorted by mana cost. The panel is only as tall
 * as its rows, up to the column's height; then the rows shrink to fit, as in
 * my deck panel. A row that was just added
 * or gained a copy glows once. The header has their class and two numbers:
 * cards in hand and cards in deck. Nothing about hidden cards (fair play):
 * a card played face down is only counted. Once the cards they have shown
 * fit one of my archetypes, its name replaces the class under "Opponent".
 */
export function OpponentPanel({ tracker }: { tracker: TrackerState }) {
  const copy = t.tracker;
  const { view, visible, deckSize } = tracker;
  const { opponent } = view;
  const rows = opponent.rows.length + (opponent.unrevealed ? 1 : 0);
  const [measureColumn, listStyle] = useFitRows(rows, deckSize, HEADER_PX);
  const rules = useArchetypeRules(opponent.cls);
  // Only the rows on screen count (cards the player has seen too): fair play.
  const archetype = useMemo(
    () => (opponent.cls && rules.length ? classifyArchetype(opponent.cls, opponent.rows.map((r) => r.dbfId), rules) : null),
    [opponent.cls, opponent.rows, rules],
  );

  return (
    <div ref={measureColumn} className="flex h-full w-full min-w-0 items-start">
      <PanelShell
        panel="opponent"
        fill={false}
        visible={visible}
        heading={
          <span className="min-w-0">
            <span className="block truncate font-display text-[15px] leading-tight text-title-gold">{copy.opponent}</span>
            {archetype ? (
              <span className="block truncate text-[10.5px] leading-tight text-brass-light" title={copy.archetypeLabel(archetype.name)}>
                {archetype.name}
              </span>
            ) : (
              <span className="block truncate text-[10.5px] leading-tight text-ink-muted">{opponent.cls ? classLabel(opponent.cls) : copy.turn(view.turn)}</span>
            )}
          </span>
        }
        aside={
          <p className="stat flex shrink-0 items-center gap-2.5 text-lg leading-none font-bold text-brass-bright">
            <span className="flex items-center gap-1" aria-label={copy.hand(opponent.handCount)} title={copy.hand(opponent.handCount)}>
              <Hand aria-hidden className="size-3.5 text-brass" />
              {opponent.handCount}
            </span>
            <span className="flex items-center gap-1" aria-label={copy.deckLeft(opponent.deckCount)} title={copy.deckLeft(opponent.deckCount)}>
              <Layers aria-hidden className="size-3.5 text-brass" />
              {opponent.deckCount}
            </span>
          </p>
        }
      >
        {view.status !== "waiting" && (
          <>
            {rows === 0 && <p className="px-1 text-[11px] leading-snug text-ink-muted">{copy.noPlays}</p>}
            <ul
              data-lenis-prevent
              aria-label={copy.opponentCards}
              className="flex min-h-0 flex-col overflow-y-auto overscroll-contain [scrollbar-width:none]"
              style={listStyle}
            >
              {opponent.rows.map((r) => (
                // The key changes with the count, so a new copy plays the glow again.
                <DeckCardRow
                  key={`${r.cardId}:${r.count}`}
                  cardId={r.cardId}
                  name={r.name}
                  cost={r.cost}
                  legendary={r.rarity === "LEGENDARY"}
                  badge={`×${r.count}`}
                  badgeLabel={copy.seenCopies(r.count)}
                  previewSide="right"
                  fresh
                />
              ))}
              {opponent.unrevealed > 0 && (
                <li
                  key={`unrevealed:${opponent.unrevealed}`}
                  aria-label={copy.unknownCards(opponent.unrevealed)}
                  className="tracker-row-new relative flex h-(--row-h) shrink-0 items-center gap-[0.35em] rounded-xs border border-dashed border-brass/30 bg-sunken/70 pr-[0.3em] pl-px text-ink-muted"
                >
                  <ManaGem cost={null} className="size-[calc(var(--row-h)-4px)] text-[1.05em] opacity-70" />
                  <span className="min-w-0 flex-1 truncate leading-none">{copy.unknownCard}</span>
                  <span aria-hidden className="stat flex h-[calc(var(--row-h)-8px)] min-w-[1.5em] items-center justify-center px-[0.25em] text-[1.1em] leading-none font-bold">
                    ×{opponent.unrevealed}
                  </span>
                </li>
              )}
            </ul>
          </>
        )}
      </PanelShell>
    </div>
  );
}
