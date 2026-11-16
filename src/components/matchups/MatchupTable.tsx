import { ClassPortrait } from "@/components/cards/ClassPortrait";
import { formatPercent } from "@/lib/format";
import type { MatchupBy, MatchupMatrix } from "@/lib/stats/matchups";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { columnLabel, rowLabel } from "./MatchupHeatmap";

const copy = t.matchups;

/** The same matchups as a plain table, most played first, with the likely range of each win rate. */
export function MatchupTable({ matrix, by }: { matrix: MatchupMatrix; by: MatchupBy }) {
  const pairs = matrix.rows
    .flatMap((row) => matrix.columns.flatMap((cls) => (row.cells[cls] ? [{ row, cls, wr: row.cells[cls] }] : [])))
    .sort((a, b) => b.wr.n + b.wr.ties - (a.wr.n + a.wr.ties) || b.wr.rate - a.wr.rate);
  const head = "px-3 py-2 text-xs font-medium tracking-[0.08em] text-ink-muted uppercase";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="border-b border-brass/20 text-left">
            <th scope="col" className={head}>{copy.you[by]}</th>
            <th scope="col" className={head}>{copy.opponent}</th>
            <th scope="col" className={cn(head, "text-right")}>{copy.games}</th>
            <th scope="col" className={cn(head, "text-right")}>{copy.record}</th>
            <th scope="col" className={cn(head, "text-right")}>{copy.winRate}</th>
            <th scope="col" className={cn(head, "text-right")}>{copy.range}</th>
          </tr>
        </thead>
        <tbody className="stat divide-y divide-brass/10">
          {pairs.map(({ row, cls, wr }) => (
            <tr key={`${row.key}:${cls}`} className={cn(wr.lowSample && "text-parchment/60")}>
              <td className="px-3 py-2">
                <span className="flex items-center gap-2 font-sans text-sm">
                  <ClassPortrait cls={row.cls} size={22} />
                  <span className="truncate">{rowLabel(row, by)}</span>
                </span>
              </td>
              <td className="px-3 py-2">
                <span className="flex items-center gap-2 font-sans text-sm">
                  <ClassPortrait cls={matrix.columnInfo[cls]?.cls ?? cls} size={22} />
                  <span className="truncate">{columnLabel(matrix, cls)}</span>
                </span>
              </td>
              <td className="px-3 py-2 text-right">{wr.n + wr.ties}</td>
              <td className="px-3 py-2 text-right">
                {t.decks.record(wr.wins, wr.losses)}
                {wr.ties > 0 && <span className="ml-1 text-xs text-ink-muted">{copy.ties(wr.ties)}</span>}
              </td>
              <td className={cn("px-3 py-2 text-right text-base font-bold", wr.n === 0 ? "text-ink-muted" : wr.rate >= 0.5 ? "text-win" : "text-loss", wr.lowSample && "opacity-70")}>
                {wr.n ? formatPercent(wr.rate) : "–"}
              </td>
              <td className="px-3 py-2 text-right text-sm text-ink-muted">
                {wr.n ? `${formatPercent(wr.lower).replace(".0%", "%")} – ${formatPercent(wr.upper).replace(".0%", "%")}` : "–"}
                {wr.lowSample && <span className="ml-2 rounded-xs border border-brass/25 px-1 font-sans text-[11px]">{copy.few}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
