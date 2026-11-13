import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Layers } from "lucide-react";
import { ClassPortrait } from "@/components/cards/ClassPortrait";
import { AddDeck } from "@/components/decks/AddDeck";
import { deckView } from "@/components/decks/deck-view";
import { PageHeader } from "@/components/layout/PageHeader";
import { ArtCrop } from "@/components/tavern/ArtCrop";
import { FramePanel } from "@/components/tavern/FramePanel";
import { Skeleton } from "@/components/ui/skeleton";
import { classLabel } from "@/lib/cards/class-colors";
import { listDecks } from "@/lib/db/queries/decks";
import { getClassArtChoices } from "@/lib/db/queries/preferences";
import { formatPercent, formatShortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

const copy = t.decks;

async function DeckList() {
  // The DB is local and changes at any time: read it per request, never at build time.
  await connection();
  const decks = listDecks();
  const choices = getClassArtChoices();

  if (!decks.length) {
    return (
      <FramePanel>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Layers className="size-6 text-brass" aria-hidden />
          <h2 className="font-display text-2xl font-semibold text-title-gold">{copy.empty}</h2>
          <p className="max-w-md text-sm text-ink-muted">{copy.emptyBody}</p>
        </div>
      </FramePanel>
    );
  }

  return (
    <section aria-labelledby="deck-list">
      <h2 id="deck-list" className="font-display mb-4 text-2xl font-semibold text-title-gold">
        {copy.listTitle}
      </h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((d) => {
          const { art, wr } = deckView(d, choices);
          return (
            <li key={d.id}>
              <Link
                href={`/decks/${d.id}`}
                aria-label={copy.open(d.name)}
                className="glow-hover brass-frame group relative isolate flex h-44 flex-col justify-end overflow-hidden rounded-lg p-4 outline-none [--frame-fill:#120d0a] focus-visible:ring-2 focus-visible:ring-ring"
              >
                {art && (
                  <div aria-hidden className="absolute inset-0 -z-10 transition-transform duration-300 ease-snap group-hover:scale-[1.04]">
                    <ArtCrop cardId={art} focus="face" zoom={1.1} className="brightness-[0.55] saturate-[0.9]" />
                  </div>
                )}
                <span aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-oak-deep via-oak-deep/70 to-transparent" />
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs text-ink-muted">
                      <ClassPortrait cls={d.playerClass} size={22} />
                      {classLabel(d.playerClass)} · {t.filters.formats[d.format]} · {copy.versions(d.versions)}
                    </p>
                    <p className="font-display mt-1 truncate text-xl font-semibold text-brass-light [text-shadow:0_1px_6px_#000]">{d.name}</p>
                    <p className="stat text-sm text-parchment/85">{d.lastPlayed ? copy.lastPlayed(formatShortDateTime(d.lastPlayed)) : copy.noGames}</p>
                  </div>
                  {wr.n > 0 && (
                    <div className={cn("stat shrink-0 text-right", wr.lowSample && "opacity-75")}>
                      <p className={cn("text-3xl leading-none font-semibold", wr.rate >= 0.5 ? "text-win" : "text-loss")}>{formatPercent(wr.rate)}</p>
                      <p className="text-xs text-parchment/80">
                        {copy.record(wr.wins, wr.losses)} · {t.overview.n(String(wr.n))}
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function DecksPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-8 md:px-8">
      <PageHeader title={t.pages.decks.title} description={t.pages.decks.description} />
      <div className="grid grid-cols-1 gap-8">
        <AddDeck />
        <Suspense fallback={<Skeleton aria-hidden className="h-44 rounded-lg bg-card" />}>
          <DeckList />
        </Suspense>
      </div>
    </div>
  );
}
