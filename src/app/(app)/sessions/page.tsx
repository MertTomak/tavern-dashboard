import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { SearchX, TriangleAlert } from "lucide-react";
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
import { SESSION_GAP_MIN, TILT_GAP, TILT_LOSSES, buildSessions, sessionTilt, winRateByGameNumber, type Session, type Tilt } from "@/lib/stats/sessions";
import { winRate, type WinRate } from "@/lib/stats/winrate";
import { cn } from "@/lib/utils";
import { TIME_ZONE, t } from "@/i18n";

const copy = t.sessions;
/** Positions shown in the chart; very long sittings are rare and their tail is noise. */
const MAX_GAME_NUMBER = 15;
/** A tilted session that ended this recently is "now": it gets a banner at the top. */
const TILT_NOW_MIN = 60;

const points = (gap: number) => Math.round(gap * 100);

/** The tilt line under a session (and, for the session still going, the banner at the top). */
function TiltNote({ tilt, overall, banner }: { tilt: Tilt; overall: WinRate; banner?: boolean }) {
  const text = copy.tilt.note(tilt.run.length, points(tilt.gap), formatPercent(overall.rate).replace(".0%", "%"));
  if (banner) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-lg border border-loss/50 bg-loss/10 px-4 py-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-loss" aria-hidden />
        <div>
          <p className="font-medium text-parchment">{copy.tilt.now}</p>
          <p className="text-sm text-parchment/85">{text}</p>
        </div>
      </div>
    );
  }
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-loss">
      <TriangleAlert className="size-4 shrink-0" aria-hidden />
      <span>
        <span className="font-medium">{copy.tilt.label}</span> · {text}
      </span>
    </p>
  );
}

function Plaque({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="brass-frame rounded-lg px-5 py-4 [--frame-fill:#1a130ef2]">
      <p className="stat text-xs tracking-[0.08em] text-ink-muted uppercase">{label}</p>
      <p className="stat text-3xl leading-tight font-semibold text-brass-bright">{value}</p>
      {note && <p className="stat text-xs text-ink-muted">{note}</p>}
    </div>
  );
}

function SessionRow({ session, tilt, overall }: { session: Session; tilt: Tilt | null; overall: WinRate }) {
  const { wr } = session;
  const inRun = (i: number) => tilt !== null && i >= tilt.run.start && i < tilt.run.start + tilt.run.length;
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
          {session.games.map((g, i) => (
            <li key={g.id}>
              <Link
                href={`/games/${g.id}`}
                title={t.overview.vs(classLabel(g.opponentClass))}
                className={cn("block rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-ring", inRun(i) && "ring-1 ring-loss/80 ring-offset-1 ring-offset-oak-deep")}
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
        {tilt && <TiltNote tilt={tilt} overall={overall} />}
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
  const now = new Date();
  const games = getStatGames({ from: rangeStart(filters.range, now, TIME_ZONE), mode: filters.mode, format: filters.format });
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
  const overall = winRate(games.map((g) => g.result));
  const tilts = new Map(sessions.map((s) => [s.id, sessionTilt(s, overall)]));
  const latest = sessions[sessions.length - 1];
  const latestTilt = tilts.get(latest.id);
  const tiltNow = latestTilt && now.getTime() - new Date(latest.end).getTime() <= TILT_NOW_MIN * 60_000 ? latestTilt : null;

  return (
    <div className="grid grid-cols-1 gap-6">
      {tiltNow && <TiltNote tilt={tiltNow} overall={overall} banner />}
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

      <FramePanel title={copy.list} hint={`${copy.listHint(t.filters.ranges[filters.range])} · ${copy.tilt.rule(TILT_LOSSES, points(TILT_GAP))}`}>
        <ol className="divide-y divide-brass/10">
          {[...sessions].reverse().map((s) => (
            <SessionRow key={s.id} session={s} tilt={tilts.get(s.id) ?? null} overall={overall} />
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
