import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { FramePanel } from "@/components/tavern/FramePanel";
import { GameListControls } from "@/components/games/GameListControls";
import { GamesTable } from "@/components/games/GamesTable";
import { Pager } from "@/components/games/Pager";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listDeckOptions } from "@/lib/db/queries/decks";
import { listGames, opponentClassesFaced } from "@/lib/db/queries/games";
import { hasAnyGames } from "@/lib/db/queries/overview";
import { parseFilters, rangeStart } from "@/lib/filters";
import { formatDuration, formatNumber, formatShortDateTime } from "@/lib/format";
import { parseGameListParams } from "@/lib/games-list";
import { rankLabel } from "@/lib/stats/rank";
import type { ListGame } from "@/components/games/types";
import { TIME_ZONE, t } from "@/i18n";

type Search = Awaited<PageProps<"/games">["searchParams"]>;

function toQuery(sp: Search): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const one of Array.isArray(v) ? v : v ? [v] : []) qs.append(k, one);
  return qs.toString();
}

async function Games({ searchParams }: { searchParams: PageProps<"/games">["searchParams"] }) {
  // The DB is local and changes at any time: read it per request, never at build time.
  await connection();
  if (!hasAnyGames()) return <EmptyState />;

  const sp = await searchParams;
  const filters = parseFilters(sp);
  const list = parseGameListParams(sp);
  const { rows, total, page, pages } = listGames({ ...list, from: rangeStart(filters.range, new Date(), TIME_ZONE), mode: filters.mode, format: filters.format });
  const decks = listDeckOptions();
  const games: ListGame[] = rows.map((g) => ({
    ...g,
    when: formatShortDateTime(g.playedAt),
    durationText: g.durationSec === null ? t.games.unknown : formatDuration(g.durationSec),
    rankText: g.mode === "RANKED" && g.rankAfter !== null ? rankLabel(g.rankAfter, g.legendRank) : null,
  }));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <GameListControls opponents={opponentClassesFaced()} decks={decks} />
        <p className="stat text-sm text-ink-muted" aria-live="polite">
          {t.games.count(formatNumber(rows.length), formatNumber(total))} · {t.filters.ranges[filters.range]}
        </p>
      </div>
      <FramePanel>
        {games.length ? (
          <>
            <GamesTable games={games} decks={decks} sort={list.sort} dir={list.dir} />
            <Pager query={toQuery(sp)} page={page} pages={pages} />
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <SearchX className="size-6 text-brass" aria-hidden />
            <h2 className="font-display text-2xl font-semibold text-title-gold">{t.games.noMatch}</h2>
            <p className="text-sm text-ink-muted">{t.games.noMatchBody}</p>
            <Link href="/games" className={buttonVariants({ variant: "outline", className: "mt-2" })}>
              {t.games.clear}
            </Link>
          </div>
        )}
      </FramePanel>
    </>
  );
}

function GamesSkeleton() {
  return (
    <div aria-hidden className="grid gap-4">
      <Skeleton className="h-9 w-2/3 rounded-full bg-card" />
      <Skeleton className="h-96 rounded-lg bg-card" />
    </div>
  );
}

export default function GamesPage({ searchParams }: PageProps<"/games">) {
  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-8 md:px-8">
      <PageHeader title={t.pages.games.title} description={t.pages.games.description} />
      <Suspense fallback={<GamesSkeleton />}>
        <Games searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
