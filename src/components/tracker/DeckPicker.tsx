"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { trackerBridge } from "@/lib/tracker/bridge";
import type { TrackerView } from "@/lib/tracker/view";
import { t } from "@/i18n";

const decksSchema = z.object({ decks: z.array(z.object({ id: z.number(), name: z.string(), playerClass: z.string() })) });
type SavedDeck = z.infer<typeof decksSchema>["decks"][number];

/**
 * "Pick your deck": shown at the top of my deck panel when Hearthstone wrote
 * no deck code for the game. Lists my saved decks of the class I am playing;
 * the choice is counted down at once and remembered by the app for next time.
 * With a picked or matched deck it folds into a small "Change deck" button.
 */
export function DeckPicker({ cls, source }: { cls: string; source: Exclude<TrackerView["deck"]["source"], "code"> }) {
  const copy = t.tracker;
  const [decks, setDecks] = useState<SavedDeck[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/tracker/decks")
      .then((res) => res.json())
      .then((data: unknown) => alive && setDecks(decksSchema.parse(data).decks.filter((d) => d.playerClass === cls)))
      .catch(() => alive && setDecks([]));
    return () => {
      alive = false;
    };
  }, [cls]);

  if (!decks) return null;
  const undecided = source === "seen";
  if (!decks.length) return undecided ? <p className="rounded-xs border border-brass/20 bg-sunken/80 px-2 py-1 text-[11px] leading-snug text-ink-muted">{copy.pickNone}</p> : null;

  const list = (
    <ul className="flex flex-col gap-1">
      {decks.map((d) => (
        <li key={d.id}>
          <button
            type="button"
            aria-label={copy.pickThis(d.name)}
            onClick={() => {
              trackerBridge()?.pickDeck(d.id);
              setOpen(false);
            }}
            className="w-full truncate rounded-xs border border-brass/40 bg-oak-deep px-2 py-1 text-left text-[12.5px] font-medium text-parchment outline-none hover:border-brass-light hover:text-title-gold focus-visible:ring-2 focus-visible:ring-ring"
          >
            {d.name}
          </button>
        </li>
      ))}
    </ul>
  );

  if (undecided) {
    return (
      <section aria-label={copy.pickDeck} className="flex flex-col gap-1.5 rounded-xs border border-brass/45 bg-sunken/85 p-2">
        <h3 className="font-display text-[13px] leading-none text-title-gold">{copy.pickDeck}</h3>
        <p className="text-[10.5px] leading-snug text-ink-muted">{copy.pickHint}</p>
        {list}
      </section>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="self-start rounded-xs text-[10.5px] text-brass-light underline decoration-brass/50 underline-offset-2 outline-none hover:text-title-gold focus-visible:ring-2 focus-visible:ring-ring"
      >
        {copy.changeDeck}
      </button>
      {open && list}
    </div>
  );
}
