"use client";

import { useEffect, useId, useState } from "react";
import { ClipboardPaste, Loader2, Minus, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { CardTile, type TileCard } from "@/components/cards/CardTile";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ARCHETYPE_CARDS_MAX, ARCHETYPE_NAME_MAX } from "@/lib/validation/archetypes";
import { t } from "@/i18n";

export type SignatureCard = { dbfId: number; card: TileCard };
export type ArchetypeDraft = { id: number | null; name: string; playerClass: string; minMatches: number; cards: SignatureCard[] };

const copy = t.archetypes;
const tileSchema = z.object({ id: z.string(), name: z.string(), cost: z.number().nullable(), rarity: z.string().nullable() });
const searchSchema = z.object({ cards: z.array(z.object({ dbfId: z.number(), card: tileSchema })) });
const previewSchema = z.object({ playerClass: z.string(), cards: z.array(z.object({ dbfId: z.number(), card: tileSchema })) });
const errorSchema = z.object({ error: z.string() });

/** Matches needed for a list taken from a deck code: a few, since every deck of a class shares some cards. */
const FROM_CODE_MIN = 3;

const byCost = (a: SignatureCard, b: SignatureCard) => (a.card.cost ?? 0) - (b.card.cost ?? 0) || a.card.name.localeCompare(b.card.name);

const inputClass =
  "h-9 w-full rounded-md border border-brass/30 bg-oak-deep/70 px-3 text-sm text-parchment outline-none placeholder:text-ink-muted/60 focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
  draft: ArchetypeDraft | null;
  /** Start with the deck code box open (the "From a deck code" button). */
  withCode: boolean;
  classes: { cls: string; label: string }[];
  onClose: () => void;
  onSaved: () => void;
};

/** Create or edit an archetype: name, class, signature cards (search or a pasted deck code) and how many must be seen. */
export function ArchetypeDialog({ draft, withCode, classes, onClose, onSaved }: Props) {
  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl" data-lenis-prevent>
        {draft && <Editor key={draft.id ?? "new"} draft={draft} withCode={withCode} classes={classes} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function Editor({ draft, withCode, classes, onClose, onSaved }: Omit<Props, "draft"> & { draft: ArchetypeDraft }) {
  const ids = { name: useId(), code: useId(), search: useId(), min: useId() };
  const [name, setName] = useState(draft.name);
  const [cls, setCls] = useState(draft.playerClass);
  const [cards, setCards] = useState<SignatureCard[]>(draft.cards);
  const [minMatches, setMinMatches] = useState(draft.minMatches);
  const [code, setCode] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SignatureCard[] | null>(null);
  const [busy, setBusy] = useState<"reading" | "saving" | null>(null);

  // Card search: waits for a short pause in typing, then asks the server.
  useEffect(() => {
    if (query.trim().length < 2) return;
    let alive = true;
    const timer = setTimeout(() => {
      fetch(`/api/cards/search?${new URLSearchParams({ q: query.trim(), cls })}`)
        .then((res) => res.json())
        .then((data: unknown) => alive && setResults(searchSchema.parse(data).cards))
        .catch(() => alive && setResults([]));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, cls]);

  const chosen = new Set(cards.map((c) => c.dbfId));
  const max = Math.max(1, cards.length);
  const min = Math.min(minMatches, max);

  async function readCode() {
    if (!code.trim()) return;
    setBusy("reading");
    try {
      const res = await fetch("/api/decks/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: code }) });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error(errorSchema.safeParse(data).data?.error ?? copy.errors.failed);
      const deck = previewSchema.parse(data);
      if (deck.playerClass !== cls) toast.info(copy.errors.otherClass(classes.find((c) => c.cls === deck.playerClass)?.label ?? deck.playerClass));
      setCls(deck.playerClass);
      setCards(deck.cards.slice(0, ARCHETYPE_CARDS_MAX).map(({ dbfId, card }) => ({ dbfId, card })));
      setMinMatches(Math.min(FROM_CODE_MIN, deck.cards.length));
      setCode("");
      toast.success(copy.readDone(deck.cards.length));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.errors.failed);
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("saving");
    try {
      const body = JSON.stringify({ name: name.trim(), playerClass: cls, signatureCards: cards.map((c) => c.dbfId), minMatches: min });
      const res = await fetch(draft.id === null ? "/api/archetypes" : `/api/archetypes/${draft.id}`, {
        method: draft.id === null ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error(errorSchema.safeParse(data).data?.error ?? copy.errors.failed);
      toast.success(copy.saved(name.trim(), z.object({ changed: z.number() }).catch({ changed: 0 }).parse(data).changed));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.errors.failed);
      setBusy(null);
    }
  }

  const disabled = busy !== null;
  const canSave = name.trim().length > 0 && cards.length > 0 && !disabled;
  const clsLabel = classes.find((c) => c.cls === cls)?.label ?? cls;

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) void save();
      }}
    >
      <DialogHeader>
        <DialogTitle className="font-display text-xl text-title-gold">{draft.id === null ? copy.dialogNew : copy.dialogEdit}</DialogTitle>
        <DialogDescription className="text-ink-muted">{copy.dialogHint}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid gap-1.5">
          <label htmlFor={ids.name} className="text-sm font-medium text-parchment">
            {copy.name}
          </label>
          <input id={ids.name} value={name} maxLength={ARCHETYPE_NAME_MAX} placeholder={copy.namePlaceholder} onChange={(e) => setName(e.target.value)} disabled={disabled} className={inputClass} />
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-parchment">{copy.cls}</span>
          <Select
            value={cls}
            onValueChange={(v) => {
              // Signature cards belong to one class: a new class starts a new list.
              if (v === cls) return;
              setCls(String(v));
              setCards([]);
              setResults(null);
            }}
            disabled={disabled}
          >
            <SelectTrigger aria-label={copy.cls} className="h-9 w-full border-brass/30 bg-oak-deep/70">
              <SelectValue>{clsLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.cls} value={c.cls}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <details open={withCode} className="group rounded-md border border-dashed border-brass/35 bg-oak-deep/40 p-3">
        <summary className="cursor-pointer text-sm font-medium text-parchment outline-none select-none focus-visible:ring-2 focus-visible:ring-ring">
          <ClipboardPaste className="mr-1.5 inline size-4 text-brass" aria-hidden />
          {copy.fromCode}
        </summary>
        <div className="mt-3 grid gap-2">
          <label htmlFor={ids.code} className="sr-only">
            {copy.pasteLabel}
          </label>
          <textarea
            id={ids.code}
            value={code}
            rows={2}
            spellCheck={false}
            placeholder={copy.pastePlaceholder}
            disabled={disabled}
            onChange={(e) => setCode(e.target.value)}
            className="stat resize-y rounded-md border border-brass/30 bg-oak-deep/70 px-3 py-2 text-sm text-parchment outline-none placeholder:text-ink-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="button" variant="outline" className="w-fit" disabled={disabled || !code.trim()} onClick={() => void readCode()}>
            {busy === "reading" ? <Loader2 className="animate-spin" aria-hidden /> : <ClipboardPaste aria-hidden />}
            {busy === "reading" ? copy.reading : copy.read}
          </Button>
        </div>
      </details>

      <div className="grid gap-2">
        <span className="text-sm font-medium text-parchment">
          {copy.signature} <span className="stat text-ink-muted">({cards.length})</span>
        </span>
        {cards.length ? (
          <ul className="grid gap-1.5 sm:grid-cols-2" aria-label={copy.signature}>
            {[...cards].sort(byCost).map((c) => (
              <li key={c.dbfId} className="flex min-w-0 items-center gap-1">
                <CardTile card={c.card} className="min-w-0 flex-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={copy.removeCard(c.card.name)}
                  disabled={disabled}
                  onClick={() => setCards((list) => list.filter((x) => x.dbfId !== c.dbfId))}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">{copy.signatureEmpty}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor={ids.search} className="text-sm font-medium text-parchment">
          {copy.search}
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            id={ids.search}
            value={query}
            placeholder={copy.searchPlaceholder}
            autoComplete="off"
            disabled={disabled || cards.length >= ARCHETYPE_CARDS_MAX}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length < 2) setResults(null);
            }}
            className={`${inputClass} pl-9`}
          />
        </div>
        {results && query.trim().length >= 2 && (
          <ul className="grid gap-1 sm:grid-cols-2" aria-label={copy.search}>
            {results.length === 0 && <li className="text-sm text-ink-muted">{copy.noResults}</li>}
            {results
              .filter((r) => !chosen.has(r.dbfId))
              .map((r) => (
                <li key={r.dbfId}>
                  <button
                    type="button"
                    aria-label={copy.addCard(r.card.name)}
                    onClick={() => setCards((list) => [...list, r])}
                    className="flex w-full min-w-0 items-center gap-1 rounded-xs text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus className="size-4 shrink-0 text-brass" aria-hidden />
                    <span className="min-w-0 flex-1 truncate rounded-xs border border-brass/25 bg-oak-deep px-2 py-1.5 text-[13px] text-parchment hover:border-brass/60">
                      <span className="stat mr-2 text-brass-light">{r.card.cost ?? "–"}</span>
                      {r.card.name}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="grid gap-1.5">
        <span id={ids.min} className="text-sm font-medium text-parchment">
          {copy.minMatches}
        </span>
        <div className="flex items-center gap-2" role="group" aria-labelledby={ids.min}>
          <Button type="button" variant="outline" size="icon-sm" aria-label={copy.fewer} disabled={disabled || min <= 1} onClick={() => setMinMatches(Math.max(1, min - 1))}>
            <Minus aria-hidden />
          </Button>
          <span className="stat w-8 text-center text-lg text-brass-light" aria-live="polite">
            {min}
          </span>
          <Button type="button" variant="outline" size="icon-sm" aria-label={copy.more} disabled={disabled || min >= Math.min(10, max)} onClick={() => setMinMatches(Math.min(10, max, min + 1))}>
            <Plus aria-hidden />
          </Button>
          <span className="text-sm text-ink-muted">{copy.minMatchesHint(min)}</span>
        </div>
      </div>

      <DialogFooter className="border-brass/20 bg-oak-deep/50">
        <Button type="button" variant="outline" disabled={disabled} onClick={onClose}>
          {copy.cancel}
        </Button>
        <Button type="submit" disabled={!canSave}>
          {busy === "saving" ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {busy === "saving" ? copy.saving : copy.save}
        </Button>
      </DialogFooter>
    </form>
  );
}
