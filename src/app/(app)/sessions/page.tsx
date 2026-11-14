import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { SearchX } from "lucide-react";
import { ResultChip } from "@/components/dashboard/ResultMark";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { GameNumberChart } from "@/components/sessions/GameNumberChart";
import { FramePanel } from "@/components/tavern/FramePanel";
import { Skeleton } from "@/components/ui/skeleton";
import { classLabel } from "@/lib/cards/class-colors";
import { getStatGames, hasAnyGames } from "@/lib/db/queries/overview";
import { parseFilters, rangeStart } from "@/lib/filters";
import { formatDate, formatLength, formatNumber, formatPercent, formatTime } from "@/lib/format";
import { SESSION_GAP_MIN, buildSessions, winRateByGameNumber, type Session } from "@/lib/stats/sessions";
import { cn } from "@/lib/utils";
import { TIME_ZONE, t } from "@/i18n";

const copy = t.sessions;
/** Positions shown in the chart; very long sittings are rare and their tail is noise. */
const MAX_GAME_NUMBER = 15;

function Plaque({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="brass-frame rounded-lg px-5 py-4 [--frame-fill:#1a130ef2]">
      <p className="stat text-xs tracking-[0.08em] text-ink-muted uppercase">{label}</p>
      <p className="stat text-3xl leading-tight font-semibold text-brass-bright">{value}</p>
      {note && <p className="stat text-xs text-ink-muted">{note}</p>}
    </div>
  );
}

function SessionRow({ session }: { session: Session }) {
  const { wr } = session;
  return (
    <li className="grid grid-cols-1 items-center gap-x-6 gap-y-3 py-4 md:grid-cols-[minmax(170px,0.9fr)_minmax(0,1.6fr)_auto]">
      <div>
        <p className="font-medium text-parchment">{formatDate(session.start)}</p>
        <p className="stat text-sm text-ink-muted">
          {copy.when(formatTime(session.start), formatTime(session.end))} · {formatLength(session.durationSec)} · {copy.games(session.games.length)}
        </p>
      </div>

      <div className="min-w-0">
        <ol aria-label={copy.results} className="flex flex-wrap gap-1">
          {session.games.map((g) => (
            <li key={g.id}>
              <Link
                href={`/games/${g.id}`}
                title={t.overview.vs(classLabel(g.opponentClass))}
                className="block rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ResultChip result={g.result} />
              </Link>
            </li>
          ))}
        </ol>
        <p className="mt-1.5 truncate text-sm text-ink-muted">
          <span className="sr-only">{copy.decks}: </span>
          {session.decks.map((d) => (session.decks.length > 1 ? copy.deckGames(d.name ?? copy.noDeck, d.games) : (d.name ?? copy.noDeck))).join(" · ")}
        </p>
      </div>

      <div className={cn("stat flex items-baseline gap-3 md:justify-end", wr.lowSample && "opacity-80")}>
        <span className="text-lg text-parchment">{t.decks.record(wr.wins, wr.losses)}</span>
        <span className={cn("min-w-[5.5ch] text-right text-2xl font-semibold", wr.n === 0 ? "text-ink-muted" : wr.rate >= 0.5 ? "text-win" : "text-loss")}>
          {wr.n ? formatPercent(wr.rate).replace(".0%", "%") : "–"}
        </span>
      </div>
    </li>
  );
}

async function Sessions({ searchParams }: { searchParams: PageProps<"/sessions">["searchParams"] }) {
  // The DB is local and changes at any time: read it per request, never at build time.
  await connection();
  if (!hasAnyGames()) return <EmptyState />;

  const filters = parseFilters(await searchParams);
  const games = getStatGames({ from: rangeStart(filters.range, new Date(), TIME_ZONE), mode: filters.mode, format: filters.format });
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

  const sessions = buildSessions(games);
  const byNumber = winRateByGameNumber(sessions)
    .slice(0, MAX_GAME_NUMBER)
    .filter((p) => p.wr.n > 0)
    .map((p) => ({ gameNumber: p.gameNumber, rate: p.wr.rate, n: p.wr.n, wins: p.wr.wins, losses: p.wr.losses, lowSample: p.wr.lowSample }));
  const avgLength = sessions.reduce((sum, s) => sum + s.durationSec, 0) / sessions.length;
  const best = [...sessions].filter((s) => s.wr.n >= 3).sort((a, b) => b.wr.lower - a.wr.lower)[0];

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Plaque label={copy.summary.sessions} value={formatNumber(sessions.length)} note={copy.games(games.length)} />
        <Plaque label={copy.summary.perSession} value={(games.length / sessions.length).toFixed(1)} />
        <Plaque label={copy.summary.avgLength} value={formatLength(avgLength)} />
        <Plaque
          label={copy.summary.best}
          value={best ? t.decks.record(best.wr.wins, best.wr.losses) : "–"}
          note={best ? formatDate(best.start) : undefined}
        />
      </div>

      <FramePanel title={copy.chart} hint={copy.chartHint(SESSION_GAP_MIN)}>
        {byNumber.length ? <GameNumberChart points={byNumber} /> : <p className="py-10 text-center text-sm text-ink-muted">{copy.chartEmpty}</p>}
      </FramePanel>

      <FramePanel title={copy.list} hint={copy.listHint(t.filters.ranges[filters.range])}>
        <ol className="divide-y divide-brass/10">
          {[...sessions].reverse().map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </ol>
      </FramePanel>
    </div>
  );
}

export default function SessionsPage({ searchParams }: PageProps<"/sessions">) {
  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-8 md:px-8">
      <PageHeader title={t.pages.sessions.title} description={t.pages.sessions.description} />
      <Suspense fallback={<Skeleton aria-hidden className="h-72 rounded-lg bg-card" />}>
        <Sessions searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
