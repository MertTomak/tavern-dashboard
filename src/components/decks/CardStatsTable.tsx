import { CardTile, type TileCard } from "@/components/cards/CardTile";
import { formatPercent } from "@/lib/format";
import { CARD_LOW_SAMPLE_N, type CardStat } from "@/lib/stats/cards";
import type { WinRate } from "@/lib/stats/winrate";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

const copy = t.decks.cardStats;
const pct = (r: number) => formatPercent(r).replace(".0%", "%");

/** A win rate with its game count; faded below the card sample size, a dash with no games. */
function Rate({ wr, label }: { wr: WinRate; label: string }) {
  if (!wr.n) {
    return (
      <td className="px-2 py-1.5 text-right text-ink-muted/70" aria-label={copy.none(label)}>
        –
      </td>
    );
  }
  return (
    <td className={cn("px-2 py-1.5 text-right", wr.lowSample && "opacity-50")} title={copy.cell(label, pct(wr.rate), wr.n)}>
      <span className={cn("block text-base leading-tight font-bold", wr.rate >= 0.5 ? "text-win" : "text-loss")}>{pct(wr.rate)}</span>
      <span className="block text-[11px] leading-none text-ink-muted">{t.overview.n(String(wr.n))}</span>
    </td>
  );
}

/** Difference in points between drawn and not drawn; shown only when both sides have games. */
function Delta({ s }: { s: CardStat }) {
  if (!s.drawn.n || !s.notDrawn.n) return <td className="px-2 py-1.5 text-right text-ink-muted/70">–</td>;
  const pts = Math.round((s.drawn.rate - s.notDrawn.rate) * 100);
  const faded = s.drawn.lowSample || s.notDrawn.lowSample;
  return (
    <td className={cn("px-2 py-1.5 text-right text-base font-bold", faded && "opacity-50", pts > 0 ? "text-win" : pts < 0 ? "text-loss" : "text-ink-muted")} title={copy.deltaTitle(pts)}>
      {copy.delta(pts)}
    </td>
  );
}

/**
 * Card performance for one deck: for every card in the current list, win rate
 * when kept in the mulligan, when drawn, when not drawn, when played, and the
 * average turn it is played. Every value carries its game count; fewer than
 * 15 games is faded. First column stays put while the table scrolls sideways.
 */
export function CardStatsTable({ rows }: { rows: { card: TileCard; count: number; stat: CardStat }[] }) {
  const head = "px-2 py-2 text-right text-xs font-medium tracking-[0.08em] text-ink-muted uppercase";
  return (
    <div className="-mx-1 overflow-x-auto px-1" data-lenis-prevent>
      <table className="stat w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="border-b border-brass/20">
            <th scope="col" className={cn(head, "sticky left-0 z-10 bg-(--frame-solid) text-left")}>
              {copy.card}
            </th>
            <th scope="col" className={head}>{copy.kept}</th>
            <th scope="col" className={head}>{copy.drawn}</th>
            <th scope="col" className={head}>{copy.notDrawn}</th>
            <th scope="col" className={head}>{copy.difference}</th>
            <th scope="col" className={head}>{copy.played}</th>
            <th scope="col" className={head}>{copy.avgTurn}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brass/10">
          {rows.map(({ card, count, stat }) => (
            <tr key={stat.dbfId}>
              <th scope="row" className="sticky left-0 z-10 w-[220px] bg-(--frame-solid) py-1 pr-2 text-left font-normal">
                <CardTile card={card} count={count} className="h-8" />
              </th>
              <Rate wr={stat.kept} label={copy.kept} />
              <Rate wr={stat.drawn} label={copy.drawn} />
              <Rate wr={stat.notDrawn} label={copy.notDrawn} />
              <Delta s={stat} />
              <Rate wr={stat.played} label={copy.played} />
              <td className={cn("px-2 py-1.5 text-right text-base text-parchment", stat.played.n + stat.played.ties < CARD_LOW_SAMPLE_N && "opacity-50")}>
                {stat.avgTurn === null ? <span className="text-ink-muted/70">–</span> : copy.turn(stat.avgTurn.toFixed(1))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
