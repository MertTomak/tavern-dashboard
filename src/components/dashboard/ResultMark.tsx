import { Check, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GameResult } from "@/lib/stats/winrate";
import { t } from "@/i18n";

export const RESULT_TEXT: Record<GameResult, string> = {
  WIN: "text-win",
  LOSS: "text-loss",
  TIE: "text-tie",
};

export const RESULT_BG: Record<GameResult, string> = {
  WIN: "bg-win",
  LOSS: "bg-loss",
  TIE: "bg-tie",
};

const ICON = { WIN: Check, LOSS: X, TIE: Minus } as const;

/** Square W/L/T chip: colour + letter + icon shape, so colour is never the only signal. */
export function ResultChip({ result, className }: { result: GameResult; className?: string }) {
  const Icon = ICON[result];
  return (
    <span
      className={cn(
        "stat inline-flex h-6 items-center gap-0.5 rounded-xs px-1.5 text-sm font-bold text-background",
        RESULT_BG[result],
        className,
      )}
    >
      <Icon className="size-3" strokeWidth={3} aria-hidden />
      {t.overview.resultShort[result]}
      <span className="sr-only">{t.overview.result[result]}</span>
    </span>
  );
}
