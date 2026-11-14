import { cn } from "@/lib/utils";
import { t } from "@/i18n";

/** A deck's mana curve: cards at each cost, 0 to 7+. `compact` is the small version for deck lists. */
export function ManaCurve({ curve, compact }: { curve: number[]; compact?: boolean }) {
  const copy = t.decks.detail;
  const max = Math.max(1, ...curve);
  return (
    <ol aria-label={copy.curve} className={cn("grid grid-cols-8 items-end", compact ? "h-16 gap-1" : "h-28 gap-1.5")}>
      {curve.map((n, cost) => {
        const label = cost === 7 ? "7+" : String(cost);
        return (
          <li key={cost} className="flex h-full flex-col items-center justify-end gap-1" aria-label={copy.curveLabel(label, n)}>
            {!compact && <span className="stat text-xs text-ink-muted">{n || ""}</span>}
            <span className="w-full rounded-t-xs bg-linear-to-t from-brass/50 to-brass-light/90" style={{ height: `${(n / max) * 70}%`, minHeight: n ? 4 : 0 }} />
            <span
              className={cn(
                "stat flex items-center justify-center font-semibold text-brass-light",
                compact ? "text-[11px] leading-none" : "size-6 rounded-full border border-brass/40 bg-oak-deep text-xs",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
