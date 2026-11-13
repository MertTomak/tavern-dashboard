import { ArrowDownToLine, Hand, Sparkles } from "lucide-react";
import { CardTile, type TileCard } from "@/components/cards/CardTile";
import { cn } from "@/lib/utils";
import type { Timeline } from "@/lib/games/timeline";
import { t } from "@/i18n";

type Props = { timeline: Timeline; cards: Map<number, TileCard>; wentFirst: boolean | null };

const copy = t.gameDetail;

function card(cards: Map<number, TileCard>, dbfId: number): TileCard {
  return cards.get(dbfId) ?? { id: "", name: copy.unknownCard(dbfId), cost: null, rarity: null };
}

function Tiles({ ids, cards, muted }: { ids: number[]; cards: Map<number, TileCard>; muted?: boolean }) {
  return (
    <ul className="grid gap-1.5">
      {ids.map((id, i) => (
        <li key={`${id}-${i}`}>
          <CardTile card={card(cards, id)} muted={muted} />
        </li>
      ))}
    </ul>
  );
}

/** Small named chips for draws: secondary to what was played. */
function Drew({ ids, cards }: { ids: number[]; cards: Map<number, TileCard> }) {
  if (!ids.length) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-muted">
      <ArrowDownToLine className="size-3.5 text-brass-dim" aria-hidden />
      <span className="sr-only">{copy.drew}:</span>
      {ids.map((id, i) => (
        <span key={`${id}-${i}`} className="rounded-xs border border-brass/15 bg-oak-deep/60 px-1.5 py-0.5 text-parchment/85">
          {card(cards, id).name}
        </span>
      ))}
    </p>
  );
}

function Side({ label, children, empty }: { label: string; children: React.ReactNode; empty: boolean }) {
  return (
    <div className="grid content-start gap-2">
      <p className="stat text-xs tracking-[0.08em] text-ink-muted uppercase md:sr-only">{label}</p>
      {empty ? <p className="text-xs text-ink-muted/80 italic">{copy.nothing}</p> : children}
    </div>
  );
}

/**
 * The game turn by turn: the mulligan first, then each round with your draws
 * and plays on the left and the opponent's plays on the right, like the board.
 */
export function GameTimeline({ timeline, cards, wentFirst }: Props) {
  const { mulligan, turns } = timeline;
  return (
    <div className="grid gap-6">
      {(mulligan.kept.length > 0 || mulligan.replaced.length > 0) && (
        <section aria-labelledby="mulligan" className="grid gap-3">
          <h3 id="mulligan" className="flex items-center gap-2 font-medium text-parchment">
            <Hand className="size-4 text-brass" aria-hidden />
            {copy.mulligan}
            {wentFirst !== null && <span className="text-sm font-normal text-ink-muted">· {wentFirst ? copy.wentFirst : copy.hadCoin}</span>}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid content-start gap-2">
              <p className="stat text-xs tracking-[0.08em] text-win uppercase">✓ {copy.kept}</p>
              <Tiles ids={mulligan.kept} cards={cards} />
            </div>
            {mulligan.replaced.length > 0 && (
              <div className="grid content-start gap-2">
                <p className="stat text-xs tracking-[0.08em] text-loss uppercase">✕ {copy.replaced}</p>
                <Tiles ids={mulligan.replaced} cards={cards} muted />
              </div>
            )}
          </div>
        </section>
      )}

      <section aria-label={copy.timeline}>
        <div className="stat hidden grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-brass/20 pb-2 text-xs tracking-[0.08em] text-ink-muted uppercase md:grid">
          <span />
          <span>{copy.you}</span>
          <span>{copy.opponent}</span>
        </div>
        <ol>
          {turns.map((turn) => {
            const youEmpty = !turn.you.drew.length && !turn.you.played.length;
            const oppEmpty = !turn.opponent.played.length && !turn.opponent.revealed.length;
            return (
              <li key={turn.turn} className="grid gap-3 border-b border-brass/10 py-3 md:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)] md:gap-4">
                <p className="stat flex items-baseline gap-1.5 text-brass-light md:block" aria-label={copy.turn(turn.turn)}>
                  <span className="text-xs tracking-[0.08em] text-ink-muted uppercase md:block">{copy.turnWord}</span>
                  <span className="text-2xl leading-none font-semibold">{turn.turn}</span>
                </p>
                <Side label={copy.you} empty={youEmpty}>
                  <Drew ids={turn.you.drew} cards={cards} />
                  {turn.you.played.length > 0 && <Tiles ids={turn.you.played} cards={cards} />}
                </Side>
                <Side label={copy.opponent} empty={oppEmpty}>
                  {turn.opponent.played.length > 0 && <Tiles ids={turn.opponent.played} cards={cards} />}
                  {turn.opponent.revealed.length > 0 && (
                    <div className={cn("grid gap-1.5", turn.opponent.played.length > 0 && "mt-1")}>
                      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <Sparkles className="size-3.5 text-brass-dim" aria-hidden />
                        {copy.revealed}
                      </p>
                      <Tiles ids={turn.opponent.revealed} cards={cards} />
                    </div>
                  )}
                </Side>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
