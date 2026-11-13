"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { classLabel } from "@/lib/cards/class-colors";
import { NOTES_MAX } from "@/lib/validation/games";
import { t } from "@/i18n";
import { RankPicker, type RankValue } from "./RankPicker";
import type { DeckOption } from "@/lib/db/queries/decks";
import type { ListGame } from "./types";

const NONE = "none";

type Props = { game: ListGame; decks: DeckOption[]; onDone: () => void };

/** Deck, rank (ranked games) and notes for one game. Only what changed is sent. */
export function GameEditor({ game, decks, onDone }: Props) {
  const router = useRouter();
  const notesId = useId();
  const [deck, setDeck] = useState(game.deckId === null ? NONE : String(game.deckId));
  const [rank, setRank] = useState<RankValue>({ rankAfter: game.rankAfter, legendRank: game.legendRank });
  const [notes, setNotes] = useState(game.notes ?? "");
  const [busy, setBusy] = useState(false);
  const ranked = game.mode === "RANKED";
  const cls = classLabel(game.playerClass);

  async function save() {
    const patch: Record<string, unknown> = {};
    const deckId = deck === NONE ? null : Number(deck);
    if (deckId !== game.deckId) patch.deckId = deckId;
    if (ranked && rank.rankAfter !== game.rankAfter) patch.rankAfter = rank.rankAfter;
    if (ranked && rank.legendRank !== game.legendRank) patch.legendRank = rank.legendRank;
    if (notes.trim() !== (game.notes ?? "")) patch.notes = notes;
    if (!Object.keys(patch).length) return onDone();
    setBusy(true);
    try {
      const res = await fetch(`/api/games/${game.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? t.games.saveFailed);
      }
      toast.success(t.games.saved);
      onDone();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.games.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  const deckLabel = deck === NONE ? t.games.noDeck : (decks.find((d) => String(d.id) === deck)?.name ?? t.games.noDeck);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      onKeyDown={(e) => e.key === "Escape" && onDone()}
      className="grid gap-5 px-2 pt-1 pb-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:pl-[4.25rem]"
    >
      <div className="grid content-start gap-4">
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-sm font-medium text-parchment">{t.games.deckLabel}</legend>
          {decks.length ? (
            <>
              <Select value={deck} onValueChange={(v) => setDeck(String(v))} disabled={busy}>
                <SelectTrigger aria-label={t.games.deckLabel} className="h-9 w-full max-w-72 border-brass/30 bg-oak-deep/70">
                  <SelectValue>{deckLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t.games.noDeck}</SelectItem>
                  {decks.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-ink-muted">{t.games.deckHint(cls)}</p>
            </>
          ) : (
            <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              {t.games.noDecksForClass(cls)}
              <Link href="/decks" className={buttonVariants({ variant: "outline", size: "sm" })}>
                {t.games.addDeck}
              </Link>
            </p>
          )}
        </fieldset>

        <div className="grid gap-1.5">
          <label htmlFor={notesId} className="flex justify-between text-sm font-medium text-parchment">
            {t.games.notesLabel}
            <span className="stat text-xs font-normal text-ink-muted">{t.games.notesCount(notes.length, NOTES_MAX)}</span>
          </label>
          <textarea
            id={notesId}
            value={notes}
            maxLength={NOTES_MAX}
            rows={3}
            disabled={busy}
            placeholder={t.games.notesPlaceholder}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-y rounded-md border border-brass/30 bg-oak-deep/70 px-3 py-2 text-parchment outline-none placeholder:text-ink-muted/70 focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="grid content-start gap-4">
        {ranked && (
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium text-parchment">{t.games.rankLabel}</legend>
            <RankPicker value={rank} onChange={setRank} disabled={busy} />
            {rank.rankAfter !== null && (
              <Button type="button" variant="link" size="sm" className="w-fit px-0 text-ink-muted" disabled={busy} onClick={() => setRank({ rankAfter: null, legendRank: null })}>
                {t.rank.clear}
              </Button>
            )}
          </fieldset>
        )}
        <div className="flex gap-2 md:justify-end">
          <Button type="submit" size="lg" disabled={busy} className="px-4">
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {busy ? t.games.saving : t.games.save}
          </Button>
          <Button type="button" size="lg" variant="outline" disabled={busy} onClick={onDone}>
            {t.games.cancel}
          </Button>
        </div>
      </div>
    </form>
  );
}
