"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Minus, X } from "lucide-react";
import { toast } from "sonner";
import { ClassPortrait } from "@/components/cards/ClassPortrait";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { classLabel } from "@/lib/cards/class-colors";
import { QUICK_ADD_EVENT } from "@/lib/quick-add";
import { cn } from "@/lib/utils";
import { QUICK_ADD_MODES } from "@/lib/validation/games";
import { t } from "@/i18n";

type Mode = (typeof QUICK_ADD_MODES)[number];
type Format = keyof typeof t.filters.formats;
type Props = {
  classes: string[];
  decks: { id: number; name: string; playerClass: string }[];
  defaults: { playerClass: string | null; deckId: number | null; mode: string; format: string | null };
};

const copy = t.quickAdd;
const NONE = "none";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

/** True when a key press belongs to a text field or another dialog. */
function typing(e: KeyboardEvent) {
  const el = e.target instanceof Element ? e.target : null;
  return !!el?.closest("input, textarea, select, [contenteditable='true'], [role=listbox], [role=option]");
}

function Segment<T extends string | boolean | null>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: React.ReactNode; key?: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-10 items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === o.value ? "border-brass-light bg-brass/25 text-brass-light" : "border-brass/25 bg-oak-deep/70 text-parchment hover:border-brass/60",
          )}
        >
          {o.label}
          {o.key && <kbd className="stat hidden text-xs text-ink-muted md:inline">{o.key}</kbd>}
        </button>
      ))}
    </div>
  );
}

/**
 * Quick add: a bottom sheet on phones, a dialog on wider screens. Starts from
 * the newest game's class, deck, mode and format; the opponent is a grid of
 * big portraits. Keys: 1–9 / 0 opponent, W / L result, F / C start, Enter saves.
 */
export function QuickAddSheet({ classes, decks, defaults }: Props) {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState(defaults.playerClass ?? classes[0] ?? "");
  const [deck, setDeck] = useState(defaults.deckId === null ? NONE : String(defaults.deckId));
  const [mode, setMode] = useState<Mode>((QUICK_ADD_MODES as readonly string[]).includes(defaults.mode) ? (defaults.mode as Mode) : "RANKED");
  const [format, setFormat] = useState<Format | null>((defaults.format as Format | null) ?? "STANDARD");
  const [opp, setOpp] = useState<string | null>(null);
  const [result, setResult] = useState<"WIN" | "LOSS" | null>(null);
  const [first, setFirst] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const myDecks = decks.filter((d) => d.playerClass === me);
  const ready = !!me && !!opp && !!result && !busy;

  // Each new sheet starts from what was last saved; only the game's own facts reset.
  useEffect(() => {
    const show = () => {
      setOpp(null);
      setResult(null);
      setFirst(null);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
      if (document.querySelector("[role=dialog], [role=alertdialog]")) return;
      e.preventDefault();
      show();
    };
    window.addEventListener(QUICK_ADD_EVENT, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(QUICK_ADD_EVENT, show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const save = useCallback(async () => {
    if (!me || !opp || !result) return;
    setBusy(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerClass: me, opponentClass: opp, result, mode, format, deckId: deck === NONE ? null : Number(deck), wentFirst: first }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? copy.failed);
      }
      // The live update shows the toast, refreshes the page and celebrates a win.
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.failed);
    } finally {
      setBusy(false);
    }
  }, [deck, first, format, me, mode, opp, result]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e.nativeEvent)) return;
    const k = e.key.toLowerCase();
    const i = KEYS.indexOf(k);
    if (i >= 0 && classes[i]) setOpp(classes[i]);
    else if (k === "w") setResult("WIN");
    else if (k === "l") setResult("LOSS");
    else if (k === "f") setFirst(true);
    else if (k === "c") setFirst(false);
    else if (k === "enter" && ready) void save();
    else return;
    // Handled before the focused control sees it, so a focused dropdown never type-searches "W" to Warlock.
    e.preventDefault();
    e.stopPropagation();
  }

  const deckName = deck === NONE ? copy.noDeck : (myDecks.find((d) => String(d.id) === deck)?.name ?? copy.noDeck);

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogContent
        onKeyDownCapture={onKeyDown}
        data-lenis-prevent
        className="brass-frame top-auto bottom-0 left-0 max-h-[92dvh] max-w-none translate-x-0 translate-y-0 gap-5 overflow-y-auto rounded-t-2xl rounded-b-none p-5 pb-[max(env(safe-area-inset-bottom),20px)] [--frame-fill:#1a130e] data-open:slide-in-from-bottom-8 data-closed:slide-out-to-bottom-8 sm:max-w-none md:top-1/2 md:bottom-auto md:left-1/2 md:w-[min(640px,calc(100%-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:p-6 md:data-open:slide-in-from-bottom-0 md:data-open:zoom-in-95"
      >
        <span aria-hidden className="mx-auto -mt-2 h-1 w-10 rounded-full bg-parchment/25 md:hidden" />
        <div>
          <DialogTitle className="font-display text-2xl text-title-gold">{copy.title}</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-ink-muted">{copy.hint}</DialogDescription>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium text-parchment">{copy.opponent}</legend>
          <div role="radiogroup" aria-label={copy.pickOpponent} className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {classes.map((c, i) => {
              const on = opp === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setOpp(c)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-xs transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    on ? "border-brass-light bg-brass/20 text-brass-light" : "border-transparent text-parchment/85 hover:border-brass/40",
                  )}
                >
                  <ClassPortrait cls={c} size={44} className={cn("transition-[filter] duration-150", opp && !on && "brightness-75 saturate-50")} />
                  <span className="max-w-full truncate">{classLabel(c)}</span>
                  {KEYS[i] && <kbd className="stat absolute top-1 right-1.5 hidden text-[10px] text-ink-muted md:block">{KEYS[i]}</kbd>}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-parchment">{copy.result}</span>
            <div role="radiogroup" aria-label={copy.result} className="grid grid-cols-2 gap-2">
              {(["WIN", "LOSS"] as const).map((r) => {
                const on = result === r;
                const Icon = r === "WIN" ? Check : X;
                return (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setResult(r)}
                    className={cn(
                      "stat flex h-12 items-center justify-center gap-1.5 rounded-md border-2 text-lg font-bold transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      on
                        ? r === "WIN"
                          ? "border-win bg-win text-background"
                          : "border-loss bg-loss text-background"
                        : r === "WIN"
                          ? "border-win/50 text-win hover:bg-win/10"
                          : "border-loss/50 text-loss hover:bg-loss/10",
                    )}
                  >
                    <Icon className="size-4" strokeWidth={3} aria-hidden />
                    {r === "WIN" ? copy.win : copy.loss}
                    <kbd className="hidden text-xs opacity-70 md:inline">{r === "WIN" ? "W" : "L"}</kbd>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-parchment">{copy.start}</span>
            <Segment
              label={copy.start}
              value={first}
              onChange={setFirst}
              options={[
                { value: true, label: copy.first, key: "F" },
                { value: false, label: copy.coin, key: "C" },
                { value: null, label: <Minus className="size-4" aria-label={copy.unknown} /> },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-parchment">{copy.you}</span>
            <Select
              value={me}
              onValueChange={(v) => {
                setMe(String(v));
                setDeck(NONE);
              }}
            >
              <SelectTrigger aria-label={copy.you} className="h-10 w-full border-brass/30 bg-oak-deep/70">
                <SelectValue>
                  <ClassPortrait cls={me} size={22} />
                  {classLabel(me)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c} value={c}>
                    {classLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-parchment">{copy.deck}</span>
            <Select value={deck} onValueChange={(v) => setDeck(String(v))}>
              <SelectTrigger aria-label={copy.deck} className="h-10 w-full border-brass/30 bg-oak-deep/70">
                <SelectValue>{deckName}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{copy.noDeck}</SelectItem>
                {myDecks.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-parchment">{copy.mode}</span>
            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <SelectTrigger aria-label={copy.mode} className="h-10 w-full border-brass/30 bg-oak-deep/70">
                <SelectValue>{t.filters.modes[mode]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {QUICK_ADD_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t.filters.modes[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-parchment">{copy.format}</span>
            <Select value={format ?? NONE} onValueChange={(v) => setFormat(v === NONE ? null : (v as Format))}>
              <SelectTrigger aria-label={copy.format} className="h-10 w-full border-brass/30 bg-oak-deep/70">
                <SelectValue>{format ? t.filters.formats[format] : copy.noFormat}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(t.filters.formats) as Format[]).map((f) => (
                  <SelectItem key={f} value={f}>
                    {t.filters.formats[f]}
                  </SelectItem>
                ))}
                <SelectItem value={NONE}>{copy.noFormat}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="stat hidden text-xs text-ink-muted md:block">{copy.keys}</p>
          <Button size="lg" className="h-11 w-full px-6 text-base md:w-auto" disabled={!ready} onClick={() => void save()}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {busy ? copy.saving : copy.save}
            <kbd className="stat ml-1 hidden text-xs opacity-70 md:inline">↵</kbd>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
