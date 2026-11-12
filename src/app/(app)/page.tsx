import { Suspense } from "react";
import { connection } from "next/server";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";
import { FramePanel } from "@/components/tavern/FramePanel";
import { OverviewHero } from "@/components/tavern/OverviewHero";
import { LastGames } from "@/components/tavern/LastGames";
import { AnnotatedChart } from "@/components/tavern/AnnotatedChart";
import { DeckHand } from "@/components/tavern/DeckHand";
import { HeroSelect } from "@/components/tavern/HeroSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { hasAnyGames } from "@/lib/db/queries/overview";
import { parseFilters } from "@/lib/filters";
import { t } from "@/i18n";
import { loadOverview } from "./overview-data";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1180px] px-4 pt-8 md:px-8">{children}</div>;
}

function NoMatch() {
  return (
    <Shell>
      <FramePanel>
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <SearchX className="size-6 text-brass" aria-hidden />
          <h1 className="font-display text-2xl font-semibold text-title-gold">{t.overview.noMatch}</h1>
          <p className="text-sm text-ink-muted">{t.overview.noMatchBody}</p>
        </div>
      </FramePanel>
    </Shell>
  );
}

async function Overview({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  // The DB is local and changes at any time: read it per request, never at build time.
  await connection();
  if (!hasAnyGames()) {
    return (
      <Shell>
        <EmptyState />
      </Shell>
    );
  }
  const d = loadOverview(parseFilters(await searchParams), new Date());
  if (!d) return <NoMatch />;

  return (
    <>
      <h1 className="sr-only">{t.pages.overview.title}</h1>
      <OverviewHero data={d} />
      <div className="relative mx-auto -mt-14 grid max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-8 px-4 md:px-8">
        <FramePanel title={t.concepts.lastGames}>
          <LastGames games={d.recent} />
        </FramePanel>
        <FramePanel title={t.concepts.hand} hint={t.concepts.handHint}>
          <DeckHand decks={d.decks} />
        </FramePanel>
        <FramePanel title={t.concepts.form} hint={t.overview.rollingHint(d.rolling.window)}>
          <AnnotatedChart points={d.rolling.points} milestones={d.rolling.milestones} kind="percent" ariaLabel={t.concepts.form} height={280} color="var(--chart-1)" />
        </FramePanel>
        <FramePanel title={t.concepts.matchups} hint={t.concepts.matchupsHint}>
          <HeroSelect classes={d.classes} totalGames={d.games} />
        </FramePanel>
        {d.climb.points.length > 1 && (
          <FramePanel title={t.concepts.climb} hint={d.rank ? (d.rank.legend ? t.concepts.atLegend : t.concepts.toLegend(d.rank.label)) : undefined}>
            <AnnotatedChart
              points={d.climb.points}
              milestones={d.climb.milestones}
              kind="rank"
              ariaLabel={t.concepts.climb}
              height={260}
              color="var(--chart-2)"
              curve="stepAfter"
            />
          </FramePanel>
        )}
      </div>
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-[min(72vh,600px)] rounded-none bg-oak" />
      <div className="mx-auto -mt-14 grid max-w-[1180px] gap-8 px-4 md:px-8">
        <Skeleton className="h-56 rounded-lg bg-card" />
        <Skeleton className="h-80 rounded-lg bg-card" />
      </div>
    </div>
  );
}

export default function OverviewPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview searchParams={searchParams} />
    </Suspense>
  );
}
