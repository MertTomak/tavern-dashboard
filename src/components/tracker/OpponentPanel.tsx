"use client";

import { Layers, Sparkles } from "lucide-react";
import type { HandCard, TrackerView } from "@/lib/tracker/view";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { ManaGem, TrackerCardRow } from "./TrackerRows";

/** A face-down card in the opponent's hand: never its identity, only when it arrived and how. */
function CardBack({ card }: { card: HandCard }) {
  const copy = t.tracker;
  const turn = card.turn ? String(card.turn) : copy.mulliganShort;
  return (
    <li
      className={cn(
        "relative h-[34px] w-[24px] shrink-0 rounded-[4px] border bg-[radial-gradient(circle_at_50%_35%,var(--oak-panel),var(--oak-deep))] shadow-[0_1px_3px_rgb(0_0_0/0.5)]",
        card.coin ? "border-brass-light" : "border-brass/45",
      )}
      aria-label={copy.handCard(card.slot, copy.drawnOnTurn(card.turn), card.coin, card.created)}
    >
      <span aria-hidden className="absolute inset-[3px] rounded-[2px] border border-brass/25" />
      {card.coin ? (
        <span aria-hidden className="absolute top-1/2 left-1/2 grid size-4 -translate-1/2 place-items-center rounded-full border border-brass-bright/80 bg-[radial-gradient(circle_at_35%_30%,var(--color-brass-light),var(--color-brass))] shadow-[0_0_6px_var(--glow)]">
          <span className="size-2 rounded-full border border-oak-deep/40" />
        </span>
      ) : (
        <span aria-hidden className="absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rotate-45 bg-brass/50" />
      )}
      {card.created && <Sparkles aria-hidden className="absolute -top-1.5 -left-1.5 size-3 rounded-full bg-oak-deep text-brass-light" />}
      <span aria-hidden className="stat absolute -right-1.5 -bottom-1.5 grid h-3.5 min-w-3.5 place-items-center rounded-full border border-brass/50 bg-oak-deep px-0.5 text-[9.5px] leading-none font-bold text-parchment">
        {turn}
      </span>
    </li>
  );
}

/**
 * The opponent, as the game shows them: card backs in hand (turn each arrived,
 * The Coin, created cards), the cards they have played by turn, and their deck size.
 */
export function OpponentPanel({ view }: { view: TrackerView }) {
  const copy = t.tracker;
  const { opponent } = view;
  const turns = [...new Set(opponent.played.map((p) => p.turn))].sort((a, b) => b - a);

  return (
    <section aria-label={copy.opponent} className="flex flex-col gap-1.5">
      <header className="flex items-center justify-between gap-2 px-0.5">
        <h2 className="font-display text-[15px] leading-tight text-title-gold">{copy.opponent}</h2>
        <p className="flex items-center gap-2 text-[11px] text-ink-muted">
          <span className="stat text-[13px] text-parchment">{copy.hand(opponent.hand.length)}</span>
          <span className="flex items-baseline gap-1" aria-label={`${opponent.deckCount} ${copy.inDeck}`}>
            <Layers aria-hidden className="size-3 self-center text-brass" />
            <span className="stat text-[15px] font-bold text-parchment">{opponent.deckCount}</span>
          </span>
        </p>
      </header>

      <ul aria-label={copy.hand(opponent.hand.length)} className="flex min-h-[40px] flex-wrap gap-x-2 gap-y-2.5 px-1.5 pt-1.5 pb-1">
        {opponent.hand.map((c) => (
          <CardBack key={c.slot} card={c} />
        ))}
      </ul>

      <div className="flex flex-col gap-1">
        <h3 className="px-0.5 text-[10.5px] tracking-wide text-ink-muted uppercase">{copy.played}</h3>
        {turns.length === 0 ? (
          <p className="px-0.5 text-[11px] text-ink-muted">{copy.noPlays}</p>
        ) : (
          <ol data-lenis-prevent className="flex max-h-[30vh] flex-col gap-1 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin]">
            {turns.map((turn) => (
              <li key={turn} className="grid grid-cols-[22px_minmax(0,1fr)] items-start gap-1">
                <span className="stat pt-1.5 text-center text-[11px] font-bold text-brass">{copy.turnShort(turn)}</span>
                <ul className="flex flex-col gap-[3px]">
                  {opponent.played
                    .filter((p) => p.turn === turn)
                    .map((p) =>
                      p.cardId && p.name ? (
                        <TrackerCardRow key={p.key} cardId={p.cardId} name={p.name} cost={p.cost} />
                      ) : (
                        <li key={p.key} className="flex h-7 items-center gap-1 rounded-xs border border-dashed border-brass/30 bg-sunken/70 pl-0.5 text-[12px] text-ink-muted">
                          <ManaGem cost={null} />
                          {copy.unknownCard}
                        </li>
                      ),
                    )}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
