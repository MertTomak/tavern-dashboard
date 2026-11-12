import { Suspense } from "react";
import { connection } from "next/server";
import { SearchX } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Panel } from "@/components/dashboard/Panel";
import { Scoreboard } from "@/components/dashboard/Scoreboard";
import { Ticker } from "@/components/dashboard/Ticker";
import { DeckStandings, Standings } from "@/components/dashboard/Standings";
import { TrendChart } from "@/components/charts/TrendChart";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Skeleton } from "@/components/ui/skeleton";
import {
  currentRank,
  decksView,
  rankPoints,
  recentView,
  rollingPoints,
  scoreboardView,
  standingsView,
} from "@/components/dashboard/overview-view";
import { getOverviewGames, hasAnyGames } from "@/lib/db/queries/overview";
import { buildOverviewSnapshot } from "@/lib/stats/overview";
import { parseFilters, rangeStart } from "@/lib/filters";
import { TIME_ZONE, t } from "@/i18n";

const ROLLING_WINDOW = 20;

function NoMatch() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card/60 px-6 py-16 text-center">
      <SearchX className="size-6 text-primary" aria-hidden />
      <h2 className="font-semibold">{t.overview.noMatch}</h2>
      <p className="text-sm text-muted-foreground">{t.overview.noMatchBody}</p>
    </div>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  // The DB is local and changes at any time: read it per request, never at build time.
  await connection();
  const filters = parseFilters(await searchParams);
  const now = new Date();
  if (!hasAnyGames()) return <EmptyState />;

  const games = getOverviewGames({ from: rangeStart(filters.range, now, TIME_ZONE), mode: filters.mode, format: filters.format });
  if (!games.length) return <NoMatch />;

  const s = buildOverviewSnapshot(games, { now, timeZone: TIME_ZONE, rollingWindow: ROLLING_WINDOW });
  const rank = rankPoints(s);

  return (
    <Stagger className="grid grid-cols-1 gap-4">
      <StaggerItem>
        <Scoreboard view={scoreboardView(s)} />
      </StaggerItem>
      <StaggerItem>
        <Ticker games={recentView(s)} />
      </StaggerItem>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <StaggerItem>
          <Panel title={t.overview.rolling} hint={t.overview.rollingHint(ROLLING_WINDOW)} className="h-full">
            <TrendChart data={rollingPoints(s, ROLLING_WINDOW)} kind="percent" ariaLabel={t.overview.rolling} height={340} />
          </Panel>
        </StaggerItem>
        <StaggerItem>
          <Panel title={t.overview.byOpponent} className="h-full">
            <Standings rows={standingsView(s)} />
          </Panel>
        </StaggerItem>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <StaggerItem>
          <Panel title={t.overview.decks} hint={t.overview.decksHint} className="h-full">
            <DeckStandings rows={decksView(s)} />
          </Panel>
        </StaggerItem>
        {rank.length > 1 && (
          <StaggerItem>
            <Panel title={t.overview.rank} hint={currentRank(s) ?? undefined} className="h-full">
              <TrendChart data={rank} kind="rank" ariaLabel={t.overview.rank} height={240} color="var(--chart-2)" curve="stepAfter" />
            </Panel>
          </StaggerItem>
        )}
      </div>
    </Stagger>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden>
      <Skeleton className="h-52 rounded-lg" />
      <Skeleton className="h-11 rounded-lg" />
      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  );
}

export default function OverviewPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <PageHeader title={t.pages.overview.title} description={t.pages.overview.description} />
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </>
  );
}
