"use client";

import { useState } from "react";
import { ChevronDown, Hand, Layers, Sparkles } from "lucide-react";
import { CardPreview } from "@/components/cards/CardPreview";
import type { HandCard, PlayedRow } from "@/lib/tracker/view";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { PanelShell } from "./PanelShell";
import { ManaGem } from "./TrackerRows";
import type { TrackerState } from "./use-tracker";

/** Turns of plays shown in full; older ones fold into one summary line. */
const OPEN_TURNS = 2;

/** A face-down card in the opponent's hand: never its identity, only when it arrived and how. */
function CardBack({ card }: { card: HandCard }) {
  const copy = t.tracker;
  const turn = card.turn ? String(card.turn) : copy.mulliganShort;
  return (
    <li
      className={cn(
        "relative h-[36px] w-[26px] shrink-0 rounded-[4px] border bg-[radial-gradient(circle_at_50%_35%,var(--oak-panel),var(--oak-deep))] shadow-[0_1px_3px_rgb(0_0_0/0.5)]",
        card.coin ? "border-brass-light" : "border-ember/50",
      )}
      aria-label={copy.handCard(card.slot, copy.drawnOnTurn(card.turn), card.coin, card.created)}
    >
      <span aria-hidden className="absolute inset-[3px] rounded-[2px] border border-ember/25" />
      {card.coin ? (
        <span aria-hidden className="absolute top-[42%] left-1/2 grid size-4 -translate-1/2 place-items-center rounded-full border border-brass-bright/80 bg-[radial-gradient(circle_at_35%_30%,var(--color-brass-light),var(--color-brass))] shadow-[0_0_6px_var(--glow)]">
          <span className="size-2 rounded-full border border-oak-deep/40" />
        </span>
      ) : (
        <span aria-hidden className="absolute top-[42%] left-1/2 size-1.5 -translate-1/2 rotate-45 bg-ember/55" />
      )}
      {card.created && <Sparkles aria-hidden className="absolute -top-1.5 -left-1.5 size-3.5 rounded-full bg-oak-deep text-brass-light" />}
      <span aria-hidden className="stat absolute -right-1.5 -bottom-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full border border-ember/60 bg-oak-deep px-0.5 text-[11.5px] leading-none font-bold text-parchment">
        {turn}
      </span>
    </li>
  );
}

/** One small line for a card the opponent played: mana, name, turn. */
function PlayedLine({ row }: { row: PlayedRow }) {
  const copy = t.tracker;
  const line = (name: string, known: boolean) => (
    <li
      tabIndex={known ? 0 : undefined}
      aria-label={copy.playedOn(name, row.turn)}
      className={cn(
        "flex h-5 min-w-0 items-center gap-1 rounded-[3px] border pr-1 text-[11.5px] leading-none outline-none focus-visible:ring-2 focus-visible:ring-ring",
        known ? "border-ember/25 bg-sunken/85 text-parchment" : "border-dashed border-ember/30 bg-sunken/60 text-ink-muted",
      )}
    >
      <ManaGem cost={row.cost} className="size-[18px] text-[11px]" />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span aria-hidden className="stat shrink-0 text-[10.5px] font-bold text-ember-light">{copy.turnShort(row.turn)}</span>
    </li>
  );
  if (!row.cardId || !row.name) return line(copy.unknownCard, false);
  return (
    <CardPreview cardId={row.cardId} name={row.name} side="bottom">
      {line(row.name, true)}
    </CardPreview>
  );
}

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-[2px]";

/**
 * The opponent, as the game shows them, in a compact ember strip top-left:
 * card backs in hand (turn each arrived, The Coin, created cards), deck size,
 * and the cards they played in their last two turns as small lines. Older
 * turns fold into one summary line that opens on a click.
 */
export function OpponentPanel({ tracker }: { tracker: TrackerState }) {
  const copy = t.tracker;
  const { view, visible } = tracker;
  const { opponent } = view;
  const [open, setOpen] = useState(false);

  const turns = [...new Set(opponent.played.map((p) => p.turn))].sort((a, b) => b - a);
  const recentTurns = new Set(turns.slice(0, OPEN_TURNS));
  const newestFirst = [...opponent.played].sort((a, b) => b.turn - a.turn || b.key - a.key);
  const recent = newestFirst.filter((p) => recentTurns.has(p.turn));
  const older = newestFirst.filter((p) => !recentTurns.has(p.turn));
  const olderTurns = turns.slice(OPEN_TURNS);

  return (
    <PanelShell
      panel="opponent"
      visible={visible}
      heading={
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="font-display text-[13px] leading-tight text-ember-light">{copy.opponent}</span>
          <span className="stat truncate text-[11px] text-ink-muted">{view.status === "over" ? copy.gameOver : copy.turn(view.turn)}</span>
        </span>
      }
      aside={
        <p className="stat flex shrink-0 items-center gap-2 text-[13px] font-bold text-parchment">
          <span className="flex items-center gap-0.5" aria-label={copy.hand(opponent.hand.length)}>
            <Hand aria-hidden className="size-3 text-ember" />
            {opponent.hand.length}
          </span>
          <span className="flex items-center gap-0.5" aria-label={copy.deckLeft(opponent.deckCount)}>
            <Layers aria-hidden className="size-3 text-ember" />
            {opponent.deckCount}
          </span>
        </p>
      }
    >
      {view.status !== "waiting" && (
        <div className="flex min-h-0 flex-col gap-x-3 gap-y-1.5 @[360px]:flex-row">
          <ul aria-label={copy.hand(opponent.hand.length)} className="flex shrink-0 flex-wrap content-start gap-x-[9px] gap-y-[9px] pt-1 pr-1.5 pb-1.5 pl-1 @[360px]:w-[218px]">
            {opponent.hand.map((c) => (
              <CardBack key={c.slot} card={c} />
            ))}
          </ul>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-[2px]">
            {turns.length === 0 ? (
              <p className="px-0.5 pt-1 text-[11px] text-ink-muted">{copy.noPlays}</p>
            ) : (
              <ol aria-label={copy.played} className={GRID}>
                {recent.map((p) => (
                  <PlayedLine key={p.key} row={p} />
                ))}
                {older.length > 0 && (
                  <li className="min-w-0">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpen((v) => !v)}
                      className="flex h-5 w-full min-w-0 items-center gap-1 rounded-[3px] border border-ember/20 px-1 text-[11px] leading-none text-ink-muted outline-none hover:text-parchment focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ChevronDown aria-hidden className={cn("size-3 shrink-0 text-ember transition-transform duration-150", open && "rotate-180")} />
                      <span className="stat min-w-0 flex-1 truncate text-left">{copy.olderTurns(olderTurns.at(-1) ?? 0, olderTurns[0] ?? 0, older.length)}</span>
                    </button>
                  </li>
                )}
              </ol>
            )}
            {open && older.length > 0 && (
              <ol data-lenis-prevent className={cn(GRID, "min-h-0 overflow-y-auto overscroll-contain border-t border-ember/20 pt-[3px] [scrollbar-width:none]")}>
                {older.map((p) => (
                  <PlayedLine key={p.key} row={p} />
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </PanelShell>
  );
}
