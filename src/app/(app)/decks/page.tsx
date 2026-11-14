import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronDown, Layers } from "lucide-react";
import { CardTile } from "@/components/cards/CardTile";
import { ClassPortrait } from "@/components/cards/ClassPortrait";
import { AddDeck } from "@/components/decks/AddDeck";
import { deckView } from "@/components/decks/deck-view";
import { ManaCurve } from "@/components/decks/ManaCurve";
import { PageHeader } from "@/components/layout/PageHeader";
import { ArtCrop } from "@/components/tavern/ArtCrop";
import { FramePanel } from "@/components/tavern/FramePanel";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { tileCardsByDbf } from "@/lib/cards/catalog";
import { classLabel } from "@/lib/cards/class-colors";
import { manaCurve } from "@/lib/cards/deck-code";
import { countGamesWithoutDeck, listDecks, type DeckSummary } from "@/lib/db/queries/decks";
import { getClassArtChoices } from "@/lib/db/queries/preferences";
import { formatPercent, formatShortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

const copy = t.decks;

/** One deck: who it is, its curve, its record, and the full list behind a fold. */
function DeckItem({ deck, choices, open }: { deck: DeckSummary; choices: Record<string, string>; open: boolean }) {
  const { art, wr } = deckView(deck, choices);
  const tiles = tileCardsByDbf(deck.cards.map((c) => c.dbfId));
  const cards = deck.cards
    .flatMap((c) => {
      const card = tiles.get(c.dbfId);
      return card ? [{ ...c, card }] : [];
    })
    .sort((a, b) => (a.card.cost ?? 0) - (b.card.cost ?? 0) || a.card.name.localeCompare(b.card.name));
  const size = deck.cards.reduce((n, c) => n + c.count, 0);
  const games = deck.results.length;

  return (
    <li className="brass-frame relative isolate overflow-hidden rounded-lg [--frame-fill:#120d0a]">
      {art && (
        <div aria-hidden className="absolute inset-y-0 left-0 -z-10 w-[min(420px,60%)] [mask-image:linear-gradient(to_right,black,transparent)]">
          <ArtCrop cardId={art} focus="face" zoom={1.1} className="brightness-[0.45] saturate-[0.9]" />
        </div>
      )}
      <div className="grid grid-cols-1 items-center gap-x-8 gap-y-4 p-5 md:grid-cols-[minmax(0,1fr)_176px_minmax(150px,auto)]">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs text-parchment/80">
            <ClassPortrait cls={deck.playerClass} size={22} />
            {classLabel(deck.playerClass)} · {t.filters.formats[deck.format]} · {copy.versions(deck.versions)}
          </p>
          <h3 className="font-display mt-1 truncate text-2xl font-semibold text-brass-light [text-shadow:0_1px_6px_#000]">
            <Link href={`/decks/${deck.id}`} aria-label={copy.open(deck.name)} className="rounded-xs outline-none hover:text-title-gold focus-visible:ring-2 focus-visible:ring-ring">
              {deck.name}
            </Link>
          </h3>
          <p className="stat text-sm text-parchment/85">{deck.lastPlayed ? copy.lastPlayed(formatShortDateTime(deck.lastPlayed)) : copy.noGames}</p>
        </div>

        <ManaCurve compact curve={manaCurve(cards.map((c) => ({ cost: c.card.cost, count: c.count })))} />

        <dl className={cn("stat grid grid-cols-[auto_auto] items-end justify-start gap-x-5 md:justify-end", wr.lowSample && wr.n > 0 && "opacity-80")}>
          <div>
            <dt className="text-xs tracking-[0.08em] text-ink-muted uppercase">{copy.winRate}</dt>
            <dd className={cn("text-4xl leading-none font-semibold", wr.n === 0 ? "text-ink-muted" : wr.rate >= 0.5 ? "text-win" : "text-loss")}>{wr.n ? formatPercent(wr.rate) : "–"}</dd>
          </div>
          <div className="text-sm text-parchment/85">
            <dd className="text-lg leading-tight text-parchment">{copy.record(wr.wins, wr.losses)}</dd>
            <dd>{copy.games(games)}</dd>
          </div>
        </dl>
      </div>

      <details open={open} className="group border-t border-brass/15 bg-oak-deep/60">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-2.5 text-sm text-parchment outline-none select-none hover:text-title-gold focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <ChevronDown aria-hidden className="size-4 text-brass transition-transform duration-200 group-open:rotate-180" />
          {copy.cardList(size)}
        </summary>
        <ul className="grid grid-cols-1 gap-1.5 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <li key={c.dbfId}>
              <CardTile card={c.card} count={c.count} />
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

async function DeckList() {
  // The DB is local and changes at any time: read it per request, never at build time.
  await connection();
  const decks = listDecks();
  const choices = getClassArtChoices();
  const withoutDeck = countGamesWithoutDeck();

  const orphans = withoutDeck > 0 && (
    <p className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brass/20 bg-sunken/70 px-4 py-3 text-sm text-parchment/90">
      <span className="max-w-[75ch]">{copy.withoutDeck(withoutDeck)}</span>
      <Link href="/games?deck=none&range=all" className={buttonVariants({ variant: "outline", size: "sm" })}>
        {copy.showWithoutDeck}
      </Link>
    </p>
  );

  if (!decks.length) {
    return (
      <>
        <FramePanel>
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Layers className="size-6 text-brass" aria-hidden />
            <h2 className="font-display text-2xl font-semibold text-title-gold">{copy.empty}</h2>
            <p className="max-w-md text-sm text-ink-muted">{copy.emptyBody}</p>
          </div>
        </FramePanel>
        {orphans}
      </>
    );
  }

  return (
    <section aria-labelledby="deck-list" className="grid gap-4">
      <header>
        <h2 id="deck-list" className="font-display text-2xl font-semibold text-title-gold">
          {copy.listTitle}
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">{copy.autoHint}</p>
      </header>
      <ul className="grid grid-cols-1 gap-4">
        {decks.map((d, i) => (
          <DeckItem key={d.id} deck={d} choices={choices} open={i === 0} />
        ))}
      </ul>
      {orphans}
    </section>
  );
}

export default function DecksPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-8 md:px-8">
      <PageHeader title={t.pages.decks.title} description={t.pages.decks.description} />
      <div className="grid grid-cols-1 gap-8">
        <Suspense fallback={<Skeleton aria-hidden className="h-44 rounded-lg bg-card" />}>
          <DeckList />
        </Suspense>
        <AddDeck />
      </div>
    </div>
  );
}
