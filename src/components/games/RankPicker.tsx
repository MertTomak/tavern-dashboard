"use client";

import { useId, useState } from "react";
import { Crown } from "lucide-react";
import { LEAGUE_COUNT, LEGEND_INDEX, rankIndex, rankParts } from "@/lib/stats/rank";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export type RankValue = { rankAfter: number | null; legendRank: number | null };

type Props = {
  value: RankValue;
  /** Called with a complete rank: after the level is clicked, on Legend, or when the Legend number changes. */
  onChange: (next: RankValue) => void;
  disabled?: boolean;
  /** Smaller buttons for the Overview prompt. */
  compact?: boolean;
};

const LEVELS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

/**
 * Two clicks to a rank, the way the game shows it: pick the league (Bronze …
 * Diamond, or Legend), then the rank 10 … 1. The league of the current value is
 * open already, so a rank up or down within it is a single click.
 */
export function RankPicker({ value, onChange, disabled, compact }: Props) {
  const parts = value.rankAfter === null ? null : rankParts(value.rankAfter, value.legendRank);
  const [league, setLeague] = useState<number | "legend" | null>(parts?.league ?? null);
  const id = useId();
  const btn = cn(
    "stat rounded-xs border text-sm font-semibold transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
    compact ? "h-8 px-2" : "h-9 px-2.5",
  );
  const on = "border-brass-light bg-brass/25 text-brass-light";
  const off = "border-brass/25 bg-oak-deep/70 text-parchment hover:border-brass/60";

  return (
    <div className="grid gap-2">
      <div role="radiogroup" aria-label={t.rank.league} className="flex flex-wrap gap-1.5">
        {Array.from({ length: LEAGUE_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={league === i}
            disabled={disabled}
            onClick={() => setLeague(i)}
            className={cn(btn, league === i ? on : off)}
          >
            {t.ranks.leagues[i]}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={league === "legend"}
          disabled={disabled}
          onClick={() => {
            setLeague("legend");
            onChange({ rankAfter: LEGEND_INDEX, legendRank: parts?.league === "legend" ? parts.legendRank : null });
          }}
          className={cn(btn, "inline-flex items-center gap-1", league === "legend" ? on : off)}
        >
          <Crown className="size-3.5" aria-hidden />
          {t.ranks.legend}
        </button>
      </div>

      {typeof league === "number" && (
        <div role="radiogroup" aria-label={`${t.ranks.leagues[league]} ${t.rank.level}`} className="grid grid-cols-10 gap-1">
          {LEVELS.map((level) => {
            const index = rankIndex(league, level);
            const selected = value.rankAfter !== null && Math.floor(value.rankAfter) === index && value.rankAfter < LEGEND_INDEX;
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${t.ranks.leagues[league]} ${level}`}
                disabled={disabled}
                onClick={() => onChange({ rankAfter: index, legendRank: null })}
                className={cn(btn, "px-0", selected ? on : off)}
              >
                {level}
              </button>
            );
          })}
        </div>
      )}

      {league === "legend" && (
        <label htmlFor={id} className="flex items-center gap-2 text-sm text-ink-muted">
          {t.rank.legendNumber}
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={1}
            max={1_000_000}
            disabled={disabled}
            defaultValue={parts?.league === "legend" && parts.legendRank ? parts.legendRank : ""}
            onBlur={(e) => {
              const n = Number(e.target.value);
              onChange({ rankAfter: LEGEND_INDEX, legendRank: Number.isInteger(n) && n > 0 ? n : null });
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="stat h-8 w-28 rounded-xs border border-brass/30 bg-oak-deep/70 px-2 text-parchment outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      )}
    </div>
  );
}
