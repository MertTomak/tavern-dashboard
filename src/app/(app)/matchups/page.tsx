import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { MatchupHeatmap } from "@/components/matchups/MatchupHeatmap";
import { MatchupTable } from "@/components/matchups/MatchupTable";
import { FramePanel } from "@/components/tavern/FramePanel";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatGames, hasAnyGames } from "@/lib/db/queries/overview";
import { parseFilters, rangeStart } from "@/lib/filters";
import { buildMatchups, type MatchupBy, type MatchupOpp } from "@/lib/stats/matchups";
import { cn } from "@/lib/utils";
import { TIME_ZONE, t } from "@/i18n";

const copy = t.matchups;
type Search = Awaited<PageProps<"/matchups">["searchParams"]>;

/** A two-way switch whose choice lives in the URL next to the filters (`param` absent = the first option). */
function UrlSwitch<T extends string>({ param, value, options, label, sp }: { param: string; value: T; options: [T, string][]; label: string; sp: Search }) {
  const href = (next: T) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (k !== param && typeof v === "string") qs.set(k, v);
    if (next !== options[0][0]) qs.set(param, next);
    const query = qs.toString();
    return query ? `/matchups?${query}` : "/matchups";
  };
  return (
    <nav aria-label={label} className="flex overflow-hidden rounded-full border border-brass/35 bg-oak-deep/70 p-0.5">
      {options.map(([option, text]) => (
        <Link
          key={option}
          href={href(option)}
          scroll={false}
          aria-current={value === option ? "true" : undefined}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
            value === option ? "bg-brass text-oak-deep" : "text-ink-muted hover:text-parchment",
          )}
        >
          {text}
        </Link>
      ))}
    </nav>
  );
}

async function Matchups({ searchParams }: { searchParams: PageProps<"/matchups">["searchParams"] }) {
  // The DB is local and changes at any time: read it per request, never at build time.
  await connection();
  if (!hasAnyGames()) return <EmptyState />;

  const sp = await searchParams;
  const filters = parseFilters(sp);
  const by: MatchupBy = sp.by === "class" ? "class" : "deck";
  const opp: MatchupOpp = sp.opp === "archetype" ? "archetype" : "class";
  const games = getStatGames({ from: rangeStart(filters.range, new Date(), TIME_ZONE), mode: filters.mode, format: filters.format });
  const matrix = buildMatchups(games, by, opp);
  const range = t.filters.ranges[filters.range];

  if (!games.length) {
    return (
      <FramePanel>
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <SearchX className="size-6 text-brass" aria-hidden />
          <h2 className="font-display text-2xl font-semibold text-title-gold">{copy.noMatch}</h2>
          <p className="text-sm text-ink-muted">{copy.noMatchBody}</p>
        </div>
      </FramePanel>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <FramePanel title={copy.heatmap} hint={opp === "archetype" ? copy.heatmapHintArchetype(range) : copy.heatmapHint(range)} action={
          <div className="flex flex-wrap justify-end gap-2">
            <UrlSwitch param="by" value={by} label={copy.by} sp={sp} options={[["deck", copy.byDeck], ["class", copy.byClass]]} />
            <UrlSwitch param="opp" value={opp} label={copy.oppBy} sp={sp} options={[["class", copy.oppClasses], ["archetype", copy.oppArchetypes]]} />
          </div>
        } className="[--frame-solid:#1a130e]">
        <MatchupHeatmap matrix={matrix} by={by} />
      </FramePanel>
      <FramePanel title={copy.table} hint={copy.tableHint}>
        <MatchupTable matrix={matrix} by={by} />
      </FramePanel>
    </div>
  );
}

export default function MatchupsPage({ searchParams }: PageProps<"/matchups">) {
  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-8 md:px-8">
      <PageHeader title={t.pages.matchups.title} description={t.pages.matchups.description} />
      <Suspense fallback={<Skeleton aria-hidden className="h-72 rounded-lg bg-card" />}>
        <Matchups searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
