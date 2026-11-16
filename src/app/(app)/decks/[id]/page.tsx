import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { CardTile } from "@/components/cards/CardTile";
import { ClassPortrait } from "@/components/cards/ClassPortrait";
import { ResultChip } from "@/components/dashboard/ResultMark";
import { DeckActions } from "@/components/decks/DeckActions";
import { deckView } from "@/components/decks/deck-view";
import { ManaCurve } from "@/components/decks/ManaCurve";
import { ArtCrop } from "@/components/tavern/ArtCrop";
import { FramePanel } from "@/components/tavern/FramePanel";
import { Skeleton } from "@/components/ui/skeleton";
import { tileCardsByDbf } from "@/lib/cards/catalog";
import { classLabel } from "@/lib/cards/class-colors";
import { manaCurve } from "@/lib/cards/deck-code";
import { deckCardGames, getDeck } from "@/lib/db/queries/decks";
import { CardStatsTable } from "@/components/decks/CardStatsTable";
import { buildCardStats, CARD_LOW_SAMPLE_N } from "@/lib/stats/cards";
import { getClassArtChoices } from "@/lib/db/queries/preferences";
import { formatDate, formatPercent, formatShortDateTime } from "@/lib/format";
import { winRate } from "@/lib/stats/winrate";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

const copy = t.decks.detail;

async function DeckDetail({ params }: { params: PageProps<"/decks/[id]">["params"] }) {
  // The DB is local and changes at any time: read it per request, never at build time.
  await connection();
  const id = Number((await params).id);
  const deck = Number.isInteger(id) && id > 0 ? getDeck(id) : null;
  if (!deck) notFound();

  const { art, wr } = deckView(deck, getClassArtChoices());
  const tiles = tileCardsByDbf(deck.cards.map((c) => c.dbfId));
  const cards = deck.cards
    .flatMap((c) => {
      const card = tiles.get(c.dbfId);
      return card ? [{ ...c, card }] : [];
    })
    .sort((a, b) => (a.card.cost ?? 0) - (b.card.cost ?? 0) || a.card.name.localeCompare(b.card.name));
  const size = deck.cards.reduce((s, c) => s + c.count, 0);
  const cardGames = deckCardGames(deck.id);
  const stats = buildCardStats(cardGames, cards.map((c) => c.dbfId));
  const statRows = cards.map((c, i) => ({ card: c.card, count: c.count, stat: stats[i] }));

  return (
    <div className="grid gap-6">
      <section className="brass-frame brass-studs relative isolate overflow-hidden rounded-lg [--frame-fill:#120d0a]">
        {art && (
          <div aria-hidden className="absolute inset-y-0 right-0 -z-10 w-[min(560px,75%)] [mask-image:linear-gradient(to_right,transparent,black_50%)]">
            <ArtCrop cardId={art} focus="face" className="brightness-[0.55] saturate-[0.9]" />
          </div>
        )}
        <div className="grid gap-5 p-6 md:p-10">
          <Link href="/decks" className="inline-flex w-fit items-center gap-1.5 rounded-xs text-sm text-ink-muted outline-none hover:text-parchment focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeft className="size-4" aria-hidden />
            {copy.back}
          </Link>
          <div className="flex items-center gap-4">
            <ClassPortrait cls={deck.playerClass} size={56} />
            <div className="min-w-0">
              <h1 className="font-display text-4xl font-semibold text-title-gold [text-shadow:0_2px_12px_black] md:text-5xl">{deck.name}</h1>
              <p className="mt-1 text-parchment/90">{t.decks.previewMeta(classLabel(deck.playerClass), t.filters.formats[deck.format], size)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-8">
            <div className={cn("stat", wr.lowSample && "opacity-80")}>
              <p className="text-xs tracking-[0.08em] text-ink-muted uppercase">{copy.winRate}</p>
              {wr.n ? (
                <p className="text-parchment">
                  <span className="font-display text-5xl font-semibold text-brass-bright">{formatPercent(wr.rate)}</span>{" "}
                  <span className="text-lg">
                    {t.decks.record(wr.wins, wr.losses)} · {t.overview.n(String(wr.n))}
                  </span>
                </p>
              ) : (
                <p className="text-lg text-ink-muted">{t.decks.noGames}</p>
              )}
              {wr.lowSample && wr.n > 0 && <p className="text-xs text-ink-muted">{t.overview.lowSample}</p>}
            </div>
            <DeckActions id={deck.id} name={deck.name} deckstring={deck.deckstring} games={deck.results.length} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <FramePanel title={copy.cards} hint={t.decks.versions(deck.versions)}>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {cards.map((c) => (
              <li key={c.dbfId}>
                <CardTile card={c.card} count={c.count} />
              </li>
            ))}
          </ul>
        </FramePanel>

        <div className="grid content-start gap-6">
          <FramePanel>
            <h3 className="mb-3 text-sm font-medium text-parchment">{copy.curve}</h3>
            <ManaCurve curve={manaCurve(cards.map((c) => ({ cost: c.card.cost, count: c.count })))} />
          </FramePanel>

          <FramePanel title={copy.recent} hint={t.decks.matchHint}>
            {deck.recent.length ? (
              <ul className="divide-y divide-brass/10">
                {deck.recent.map((g) => (
                  <li key={g.id}>
                    <Link href={`/games/${g.id}`} className="flex items-center gap-3 rounded-xs py-2 outline-none hover:bg-brass/[0.06] focus-visible:ring-2 focus-visible:ring-ring">
                      <ResultChip result={g.result} />
                      <ClassPortrait cls={g.opponentClass} size={24} />
                      <span className="min-w-0 flex-1 truncate text-parchment">
                        {t.overview.vs(classLabel(g.opponentClass))}
                        {g.manual && <span className="ml-2 text-xs text-ink-muted">· {copy.byHand}</span>}
                      </span>
                      <span className="stat text-sm text-ink-muted">{formatShortDateTime(g.playedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">{copy.recentEmpty}</p>
            )}
          </FramePanel>

          {deck.versionList.length > 1 && (
            <FramePanel title={copy.versions}>
              <ul className="divide-y divide-brass/10">
                {deck.versionList.map((v, i) => {
                  const vr = winRate(v.results);
                  return (
                    <li key={v.id} className="stat flex items-center justify-between gap-3 py-2">
                      <span className="text-parchment">
                        {copy.version(v.versionNo)} · {formatDate(v.createdAt)}
                        {i === 0 && <span className="ml-2 rounded-xs border border-brass/40 px-1.5 text-xs text-brass-light">{copy.current}</span>}
                      </span>
                      <span className="text-ink-muted">{vr.n ? `${formatPercent(vr.rate)} · ${t.decks.record(vr.wins, vr.losses)}` : t.decks.noGames}</span>
                    </li>
                  );
                })}
              </ul>
            </FramePanel>
          )}
        </div>
      </div>

      <FramePanel title={t.decks.cardStats.title} hint={cardGames.length ? t.decks.cardStats.hint(cardGames.length, CARD_LOW_SAMPLE_N) : undefined} className="[--frame-solid:#1a130e]">
        {cardGames.length ? (
          <>
            {cardGames.length < CARD_LOW_SAMPLE_N && <p className="mb-3 text-sm text-ink-muted">{t.decks.cardStats.thin(cardGames.length, CARD_LOW_SAMPLE_N)}</p>}
            <CardStatsTable rows={statRows} />
          </>
        ) : (
          <p className="text-sm text-ink-muted">{t.decks.cardStats.empty}</p>
        )}
      </FramePanel>
    </div>
  );
}

export default function DeckPage({ params }: PageProps<"/decks/[id]">) {
  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-8 md:px-8">
      <Suspense fallback={<Skeleton aria-hidden className="h-72 rounded-lg bg-card" />}>
        <DeckDetail params={params} />
      </Suspense>
    </div>
  );
}
