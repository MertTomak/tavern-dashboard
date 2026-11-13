import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ScrollText } from "lucide-react";
import { ResultChip, RESULT_BG, RESULT_TEXT } from "@/components/dashboard/ResultMark";
import { GameActions } from "@/components/games/GameActions";
import { GameTimeline } from "@/components/games/GameTimeline";
import { ArtCrop } from "@/components/tavern/ArtCrop";
import { FramePanel } from "@/components/tavern/FramePanel";
import { Skeleton } from "@/components/ui/skeleton";
import { effectiveClassArt, tileCardsByDbf } from "@/lib/cards/catalog";
import { classLabel } from "@/lib/cards/class-colors";
import { listDeckOptions } from "@/lib/db/queries/decks";
import { getGame } from "@/lib/db/queries/games";
import { getClassArtChoices } from "@/lib/db/queries/preferences";
import { formatDateTime, formatDuration, formatShortDateTime } from "@/lib/format";
import { buildTimeline } from "@/lib/games/timeline";
import { rankLabel } from "@/lib/stats/rank";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

const copy = t.gameDetail;
const ID = /^[0-9a-f-]{36}$/;

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="stat text-xs tracking-[0.08em] text-ink-muted uppercase">{label}</dt>
      <dd className="stat truncate text-lg text-parchment">{value}</dd>
    </div>
  );
}

async function GameDetail({ params }: { params: PageProps<"/games/[id]">["params"] }) {
  // The DB is local and changes at any time: read it per request, never at build time.
  await connection();
  const { id } = await params;
  const game = ID.test(id) ? getGame(id) : null;
  if (!game) notFound();

  const choices = getClassArtChoices();
  const myArt = effectiveClassArt(game.playerClass, choices);
  const oppArt = effectiveClassArt(game.opponentClass, choices);
  const me = classLabel(game.playerClass);
  const opp = classLabel(game.opponentClass);
  const timeline = buildTimeline(game.events);
  const cards = tileCardsByDbf(game.events.map((e) => e.dbfId));
  const rankText = game.mode === "RANKED" && game.rankAfter !== null ? rankLabel(game.rankAfter, game.legendRank) : null;
  const durationText = game.durationSec === null ? t.games.unknown : formatDuration(game.durationSec);
  const start = game.wentFirst === null ? t.games.unknown : game.wentFirst ? t.games.first : t.games.coin;
  const row = { ...game, events: undefined };

  return (
    <div className="grid gap-6">
      <section className="brass-frame brass-studs relative isolate overflow-hidden rounded-lg [--frame-fill:#120d0a]">
        <div aria-hidden className="absolute inset-y-0 left-0 -z-10 w-1/2 [mask-image:linear-gradient(to_right,black_30%,transparent)]">
          {myArt && <ArtCrop cardId={myArt} focus="face" className="brightness-[0.45] saturate-[0.85]" />}
        </div>
        <div aria-hidden className="absolute inset-y-0 right-0 -z-10 w-1/2 [mask-image:linear-gradient(to_left,black_30%,transparent)]">
          {oppArt && <ArtCrop cardId={oppArt} focus="face" className="brightness-[0.45] saturate-[0.85]" />}
        </div>
        <span aria-hidden className={cn("absolute inset-x-0 bottom-0 h-1", RESULT_BG[game.result])} />
        <div className="grid gap-6 p-6 md:p-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <ResultChip result={game.result} className="h-8 px-2.5 text-base" />
            <h1 className="font-display text-4xl font-semibold text-title-gold [text-shadow:0_2px_12px_black] md:text-5xl">{copy.vs(me, opp)}</h1>
            <p className="stat text-parchment/90">
              <span className={RESULT_TEXT[game.result]}>{t.overview.result[game.result]}</span> · {formatDateTime(game.playedAt)}
            </p>
          </div>
          <dl className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-4 rounded-md bg-oak-deep/75 p-4 backdrop-blur-sm sm:grid-cols-4 lg:grid-cols-7">
            <Fact label={copy.facts.mode} value={`${t.filters.modes[game.mode]}${game.format ? ` · ${t.filters.formats[game.format]}` : ""}`} />
            <Fact label={copy.facts.start} value={start} />
            <Fact label={copy.facts.turns} value={game.turns ?? t.games.unknown} />
            <Fact label={copy.facts.duration} value={durationText} />
            <Fact label={copy.facts.deck} value={game.deckName ?? t.games.noDeck} />
            <Fact label={copy.facts.rank} value={rankText ?? t.games.unknown} />
            <Fact label={copy.facts.source} value={t.games.sourceLabel[game.source]} />
          </dl>
          {game.notes && <p className="mx-auto max-w-[65ch] text-center text-parchment/90 italic">“{game.notes}”</p>}
        </div>
      </section>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href="/games" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-ink-muted outline-none hover:text-parchment focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="size-4" aria-hidden />
          {copy.back}
        </Link>
        <div className="min-w-0 flex-1">
          <GameActions game={{ ...row, when: formatShortDateTime(game.playedAt), durationText, rankText }} decks={listDeckOptions().filter((d) => d.playerClass === game.playerClass)} />
        </div>
      </div>

      <FramePanel title={copy.timeline} hint={copy.timelineHint}>
        {game.events.length ? (
          <GameTimeline timeline={timeline} cards={cards} wentFirst={game.wentFirst} />
        ) : (
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <ScrollText className="size-4 text-brass" aria-hidden />
            {copy.noTimeline}
          </p>
        )}
      </FramePanel>
    </div>
  );
}

export default function GameDetailPage({ params }: PageProps<"/games/[id]">) {
  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-8 md:px-8">
      <Suspense fallback={<Skeleton aria-hidden className="h-72 rounded-lg bg-card" />}>
        <GameDetail params={params} />
      </Suspense>
    </div>
  );
}
