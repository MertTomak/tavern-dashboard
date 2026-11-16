import Link from "next/link";
import { ClassPortrait } from "@/components/cards/ClassPortrait";
import { classLabel } from "@/lib/cards/class-colors";
import { formatPercent } from "@/lib/format";
import type { MatchupBy, MatchupMatrix, MatchupRow } from "@/lib/stats/matchups";
import { LOW_SAMPLE_N, type WinRate } from "@/lib/stats/winrate";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

const copy = t.matchups;

/** Two-way colour centred on 50%: ember when you lose, verdigris when you win, plain near even. */
function tint(rate: number): React.CSSProperties {
  const strength = Math.min(1, Math.abs(rate - 0.5) * 2.5);
  const colour = rate >= 0.5 ? "var(--win)" : "var(--loss)";
  return { background: `color-mix(in oklab, ${colour} ${Math.round(strength * 62)}%, var(--sunken))` };
}

export function rowLabel(row: MatchupRow, by: MatchupBy): string {
  if (by === "class") return classLabel(row.cls);
  return row.deckName ?? copy.noDeck(classLabel(row.cls));
}

/** A column's name: the opponent class, the archetype, or "Unknown {Class}" for games no archetype fits. */
export function columnLabel(matrix: MatchupMatrix, key: string): string {
  const info = matrix.columnInfo[key];
  if (!info) return classLabel(key);
  if (info.archetype) return info.archetype;
  return info.key === info.cls ? classLabel(info.cls) : t.archetypes.unknown(classLabel(info.cls));
}

function Cell({ wr, you, opp, strong }: { wr: WinRate | undefined; you: string; opp: string; strong?: boolean }) {
  const games = wr ? wr.n + wr.ties : 0;
  if (!wr || games === 0) {
    return (
      <td aria-label={copy.cellEmpty(you, opp)} className="h-14 rounded-xs border border-dashed border-brass/10 text-center text-ink-muted/60">
        <span aria-hidden>·</span>
      </td>
    );
  }
  const rate = formatPercent(wr.rate).replace(".0%", "%");
  const record = t.decks.record(wr.wins, wr.losses);
  return (
    <td
      aria-label={copy.cell(you, opp, rate, record, games)}
      title={copy.cell(you, opp, rate, record, games)}
      style={wr.n ? tint(wr.rate) : undefined}
      className={cn("stat h-14 rounded-xs border border-brass/15 px-1 text-center", wr.lowSample && "opacity-55", strong && "border-brass/40")}
    >
      <span className="block text-lg leading-tight font-bold text-parchment [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">{wr.n ? rate : "–"}</span>
      <span className="block text-xs leading-none text-parchment/85">{t.overview.n(String(games))}</span>
    </td>
  );
}

/**
 * Matchup heat map: my decks (or classes) down the side, opponent classes
 * across. Each cell shows win rate and games; low-sample cells are faded.
 * The colour is never the only signal: the number is always there.
 */
export function MatchupHeatmap({ matrix, by }: { matrix: MatchupMatrix; by: MatchupBy }) {
  const all = copy.allRows[by];
  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <table className="w-full table-fixed border-separate border-spacing-1" style={{ minWidth: 170 + (matrix.columns.length + 1) * (Object.values(matrix.columnInfo).some((c) => c.key !== c.cls) ? 78 : 62) }}>
          <colgroup>
            <col className="w-[170px] lg:w-[200px]" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-(--frame-solid) pr-3 text-left text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">
                {copy.you[by]}
              </th>
              {matrix.columns.map((key) => (
                <th key={key} scope="col" className="px-0.5 pb-1 text-center align-bottom">
                  <span className={cn("flex flex-col items-center gap-1 text-[11px] leading-tight font-medium", matrix.columnInfo[key]?.archetype === null && key !== matrix.columnInfo[key]?.cls ? "text-ink-muted" : "text-parchment")}>
                    <ClassPortrait cls={matrix.columnInfo[key]?.cls ?? key} size={32} />
                    <span className="line-clamp-2 hyphens-auto">{columnLabel(matrix, key)}</span>
                  </span>
                </th>
              ))}
              <th scope="col" className="px-1 pb-1 text-center align-bottom text-xs font-medium tracking-[0.08em] text-brass-light uppercase">
                {copy.all}
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => {
              const label = rowLabel(row, by);
              const deckId = by === "deck" && row.deckName !== null ? row.key : null;
              return (
                <tr key={row.key}>
                  <th scope="row" className="sticky left-0 z-10 bg-(--frame-solid) pr-2 text-left font-normal">
                    <span className="flex items-center gap-2">
                      <ClassPortrait cls={row.cls} size={28} />
                      <span className="min-w-0">
                        {deckId ? (
                          <Link href={`/decks/${deckId}`} className="block truncate rounded-xs text-sm font-medium text-parchment outline-none hover:text-title-gold focus-visible:ring-2 focus-visible:ring-ring">
                            {label}
                          </Link>
                        ) : (
                          <span className={cn("block truncate text-sm font-medium", by === "deck" ? "text-ink-muted" : "text-parchment")}>{label}</span>
                        )}
                        <span className="stat block text-xs text-ink-muted">{t.decks.games(row.total.n + row.total.ties)}</span>
                      </span>
                    </span>
                  </th>
                  {matrix.columns.map((key) => (
                    <Cell key={key} wr={row.cells[key]} you={label} opp={columnLabel(matrix, key)} />
                  ))}
                  <Cell wr={row.total} you={label} opp={copy.all} strong />
                </tr>
              );
            })}
          </tbody>
          {matrix.rows.length > 1 && (
            <tfoot>
              <tr>
                <th scope="row" className="sticky left-0 z-10 bg-(--frame-solid) pr-3 text-left text-xs font-medium tracking-[0.08em] text-brass-light uppercase">
                  {all}
                </th>
                {matrix.columns.map((key) => (
                  <Cell key={key} wr={matrix.totals[key]} you={all} opp={columnLabel(matrix, key)} strong />
                ))}
                <Cell wr={matrix.overall} you={all} opp={copy.all} strong />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          {copy.legendLose}
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((r) => (
            <span key={r} aria-hidden style={tint(r)} className="h-3.5 w-6 rounded-[3px] border border-brass/15" />
          ))}
          {copy.legendWin}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden style={tint(0.9)} className="h-3.5 w-6 rounded-[3px] border border-brass/15 opacity-55" />
          {copy.legendFaded(LOW_SAMPLE_N)}
        </span>
      </p>
    </div>
  );
}
