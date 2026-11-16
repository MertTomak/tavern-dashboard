import { ArrowRight } from "lucide-react";
import { CardTile, type TileCard } from "@/components/cards/CardTile";
import { formatDate, formatPercent } from "@/lib/format";
import type { CardChange } from "@/lib/stats/versions";
import type { WinRate } from "@/lib/stats/winrate";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

const copy = t.decks.compare;

export type VersionStep = {
  from: { versionNo: number; createdAt: string; wr: WinRate };
  to: { versionNo: number; createdAt: string; wr: WinRate; current: boolean };
  changes: (CardChange & { card: TileCard })[];
};

function Side({ label, date, wr, current }: { label: string; date: string; wr: WinRate; current?: boolean }) {
  return (
    <div className={cn("stat min-w-0", wr.lowSample && "opacity-60")}>
      <p className="text-xs tracking-[0.08em] text-ink-muted uppercase">
        {label}
        {current && <span className="ml-1.5 rounded-xs border border-brass/40 px-1 text-[10px] text-brass-light normal-case">{t.decks.detail.current}</span>}
      </p>
      {wr.n ? (
        <p className="font-display text-3xl font-semibold text-brass-bright">{formatPercent(wr.rate).replace(".0%", "%")}</p>
      ) : (
        <p className="py-1.5 text-sm text-ink-muted">{t.decks.noGames}</p>
      )}
      <p className="text-xs text-ink-muted">
        {wr.n ? `${t.decks.record(wr.wins, wr.losses)} · ${t.overview.n(String(wr.n))} · ` : ""}
        {formatDate(date)}
      </p>
    </div>
  );
}

function ChangeList({ title, items, sign }: { title: string; items: VersionStep["changes"]; sign: "+" | "−" }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <h4 className="text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">{title}</h4>
      {items.length ? (
        <ul className="grid gap-1">
          {items.map((c) => {
            const n = Math.abs(c.to - c.from);
            return (
              <li key={c.dbfId} className="flex min-w-0 items-center gap-2">
                <span
                  aria-label={sign === "+" ? copy.addedLabel(n) : copy.removedLabel(n)}
                  className={cn("stat w-8 shrink-0 text-right text-base font-bold", sign === "+" ? "text-win" : "text-loss")}
                >
                  {sign}
                  {n}
                </span>
                <CardTile card={c.card} className="h-8 min-w-0 flex-1" muted={sign === "−"} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">{copy.nothing}</p>
      )}
    </div>
  );
}

/**
 * Deck versions side by side: for each change (newest first) the win rate
 * before and after, with game counts, and the cards that went out (−) and
 * came in (+). When the two ranges still overlap, a line says the difference
 * may be chance; low-sample sides are faded.
 */
export function VersionCompare({ steps }: { steps: VersionStep[] }) {
  return (
    <ol className="grid gap-4">
      {steps.map((s) => {
        const both = s.from.wr.n > 0 && s.to.wr.n > 0;
        const overlap = both && s.from.wr.upper >= s.to.wr.lower && s.to.wr.upper >= s.from.wr.lower;
        const removed = s.changes.filter((c) => c.to < c.from);
        const added = s.changes.filter((c) => c.to > c.from);
        return (
          <li key={s.to.versionNo} className="grid gap-4 rounded-md border border-brass/20 bg-oak-deep/60 p-4 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid content-start gap-2">
              <div className="flex items-start gap-3">
                <Side label={t.decks.detail.version(s.from.versionNo)} date={s.from.createdAt} wr={s.from.wr} />
                <ArrowRight className="mt-6 size-4 shrink-0 text-brass" aria-hidden />
                <Side label={t.decks.detail.version(s.to.versionNo)} date={s.to.createdAt} wr={s.to.wr} current={s.to.current} />
              </div>
              {both && <p className="text-xs text-ink-muted">{overlap ? copy.overlap : copy.clear}</p>}
            </div>
            <ChangeList title={copy.out} items={removed} sign="−" />
            <ChangeList title={copy.in} items={added} sign="+" />
          </li>
        );
      })}
    </ol>
  );
}
