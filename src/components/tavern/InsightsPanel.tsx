import { Info, Sparkles, TrendingUp, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import type { InsightsData } from "./types";

const ICON = { warn: TriangleAlert, good: TrendingUp, info: Info } as const;
const TONE = { warn: "text-loss", good: "text-win", info: "text-brass-light" } as const;

/**
 * Insights at the top of the Overview: up to five sentences that read the
 * numbers (each compares groups of 20+ games whose ranges do not overlap), or
 * one quiet line on why there are none yet. Severity is an icon plus a hidden
 * label, never colour alone. The hero has little room on short screens: under
 * 900 px tall only the first insight shows (without the heading, in place of
 * the "Featured today" line), under 1040 px the first three.
 */
export function InsightsPanel({ data }: { data: InsightsData }) {
  if (!data.items.length) {
    if (!data.note) return null;
    return (
      <p className="flex max-w-[760px] items-start gap-2 self-start rounded-md bg-oak-deep/60 px-3 py-2 text-sm text-ink-muted backdrop-blur-sm [text-shadow:0_1px_6px_#000] md:max-w-[min(760px,52vw)]">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-brass-dim" aria-hidden />
        {data.note}
      </p>
    );
  }
  return (
    <section aria-label={t.insights.title} className="brass-frame relative w-full max-w-[760px] self-start rounded-md px-4 py-3 backdrop-blur-md [--frame-fill:#140e0ad9] md:max-w-[min(760px,52vw)] [@media(max-height:900px)]:py-2">
      <h2 className="stat text-xs tracking-[0.12em] text-brass-dim uppercase [@media(max-height:900px)]:sr-only">{t.insights.title}</h2>
      <ul className="mt-1.5 grid gap-1.5 [@media(max-height:900px)]:mt-0">
        {data.items.map((i) => {
          const Icon = ICON[i.severity];
          return (
            <li key={i.id} className="flex items-start gap-2 text-sm leading-snug text-parchment [@media(max-height:1040px)]:nth-[n+4]:hidden [@media(max-height:900px)]:nth-[n+2]:hidden">
              <Icon className={cn("mt-0.5 size-4 shrink-0", TONE[i.severity])} aria-hidden />
              <span>
                <span className="sr-only">{t.insights.severity[i.severity]}: </span>
                {i.text}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
