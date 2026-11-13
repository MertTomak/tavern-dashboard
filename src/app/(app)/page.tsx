import { Suspense } from "react";
import { connection } from "next/server";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";
import { FramePanel } from "@/components/tavern/FramePanel";
import { OverviewHero } from "@/components/tavern/OverviewHero";
import { LastGames } from "@/components/tavern/LastGames";
import { AnnotatedChart } from "@/components/tavern/AnnotatedChart";
import { DeckShowcase } from "@/components/tavern/DeckShowcase";
import { OverviewJourney, type Chapter } from "@/components/tavern/journey/OverviewJourney";
import { HeroSelect } from "@/components/tavern/HeroSelect";
import { KineticTitle } from "@/components/tavern/journey/KineticTitle";
import { Skeleton } from "@/components/ui/skeleton";
import { hasAnyGames } from "@/lib/db/queries/overview";
import { rankPromptGame } from "@/lib/db/queries/games";
import { RankPrompt } from "@/components/dashboard/RankPrompt";
import { formatShortDateTime } from "@/lib/format";
import { getEffectsLevel, getSkippedRankPrompt } from "@/lib/db/queries/preferences";
import { effectiveEffects, isInGame } from "@/lib/live/game-state";
import { parseFilters } from "@/lib/filters";
import { t } from "@/i18n";
import { loadOverview } from "./overview-data";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1180px] px-4 pt-8 md:px-8">{children}</div>;
}

/** Chart height: grows with the screen in the journey (below the large chapter title), fixed on the vertical page. */
const CHART_HEIGHT = "clamp(220px, calc(100dvh - var(--chrome-h) - 420px), 440px)";

/** A chapter's content under its large kinetic title, centred in its full-height panel with room for the chapter rail. */
function ChapterFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col justify-center gap-3 px-4 md:px-8 journey:h-full journey:pt-4 journey:pb-20">
      <KineticTitle text={title} />
      {children}
    </div>
  );
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
  const ask = rankPromptGame(getSkippedRankPrompt());
  const prompt = ask && (
    <RankPrompt key={ask.id} gameId={ask.id} result={ask.result} opponentClass={ask.opponentClass} when={formatShortDateTime(ask.playedAt)} lastRank={ask.lastRank} />
  );
  const d = loadOverview(parseFilters(await searchParams), new Date());
  if (!d)
    return (
      <>
        <NoMatch />
        {prompt}
      </>
    );

  const chapters: Chapter[] = [
    { id: "scoreboard", label: t.journey.scoreboard, children: <OverviewHero data={d} /> },
    {
      id: "last-games",
      label: t.concepts.lastGames,
      art: d.recent[0]?.oppArt,
      streakIn: true,
      children: (
        <ChapterFrame title={t.concepts.lastGames}>
          <FramePanel>
            <LastGames games={d.recent} />
          </FramePanel>
        </ChapterFrame>
      ),
    },
    {
      id: "win-rate",
      label: t.concepts.form,
      art: d.recent[0]?.myArt,
      children: (
        <ChapterFrame title={t.concepts.form}>
          <FramePanel hint={t.overview.rollingHint(d.rolling.window)}>
            <AnnotatedChart points={d.rolling.points} milestones={d.rolling.milestones} kind="percent" ariaLabel={t.concepts.form} height={CHART_HEIGHT} color="var(--chart-1)" />
          </FramePanel>
        </ChapterFrame>
      ),
    },
    {
      id: "hand",
      label: t.concepts.hand,
      art: d.decks[0]?.art,
      children: (
        <ChapterFrame title={t.concepts.hand}>
          <FramePanel hint={t.concepts.handHint}>
            <DeckShowcase decks={d.decks} />
          </FramePanel>
        </ChapterFrame>
      ),
    },
    {
      id: "matchups",
      label: t.concepts.matchups,
      art: d.classes[0]?.art,
      children: (
        <ChapterFrame title={t.concepts.matchups}>
          <FramePanel hint={t.concepts.matchupsHint}>
            <HeroSelect classes={d.classes} totalGames={d.games} />
          </FramePanel>
        </ChapterFrame>
      ),
    },
  ];
  if (d.climb.points.length > 1) {
    chapters.push({
      id: "climb",
      label: t.concepts.climb,
      art: d.featured?.id,
      children: (
        <ChapterFrame title={t.concepts.climb}>
          <FramePanel hint={d.rank ? (d.rank.legend ? t.concepts.atLegend : t.concepts.toLegend(d.rank.label)) : undefined}>
            <AnnotatedChart
              points={d.climb.points}
              milestones={d.climb.milestones}
              kind="rank"
              ariaLabel={t.concepts.climb}
              height={CHART_HEIGHT}
              color="var(--chart-2)"
              curve="stepAfter"
            />
          </FramePanel>
        </ChapterFrame>
      ),
    });
  }

  return (
    <>
      <h1 className="sr-only">{t.pages.overview.title}</h1>
      <OverviewJourney chapters={chapters} effects={effectiveEffects(getEffectsLevel(), isInGame())} />
      {prompt}
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-[min(72vh,600px)] rounded-none bg-oak journey:h-[calc(100dvh-var(--chrome-h))]" />
      <div className="mx-auto mt-10 grid max-w-[1180px] gap-8 px-4 md:px-8 journey:hidden">
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
