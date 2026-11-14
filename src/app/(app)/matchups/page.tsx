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
import { buildMatchups, type MatchupBy } from "@/lib/stats/matchups";
import { cn } from "@/lib/utils";
import { TIME_ZONE, t } from "@/i18n";

const copy = t.matchups;
type Search = Awaited<PageProps<"/matchups">["searchParams"]>;

/** "My decks / My classes" switch; the choice lives in the URL next to the filters. */
function BySwitch({ by, sp }: { by: MatchupBy; sp: Search }) {
  const href = (value: MatchupBy) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (k !== "by" && typeof v === "string") qs.set(k, v);
    if (value === "class") qs.set("by", "class");
    const query = qs.toString();
    return query ? `/matchups?${query}` : "/matchups";
  };
  const options: [MatchupBy, string][] = [
    ["deck", copy.byDeck],
    ["class", copy.byClass],
  ];
  return (
    <nav aria-label={copy.by} className="flex overflow-hidden rounded-full border border-brass/35 bg-oak-deep/70 p-0.5">
      {options.map(([value, label]) => (
        <Link
          key={value}
          href={href(value)}
          scroll={false}
          aria-current={by === value ? "true" : undefined}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
            by === value ? "bg-brass text-oak-deep" : "text-ink-muted hover:text-parchment",
          )}
        >
          {label}
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
  const games = getStatGames({ from: rangeStart(filters.range, new Date(), TIME_ZONE), mode: filters.mode, format: filters.format });
  const matrix = buildMatchups(games, by);
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
      <FramePanel title={copy.heatmap} hint={copy.heatmapHint(range)} action={<BySwitch by={by} sp={sp} />} className="[--frame-solid:#1a130e]">
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
