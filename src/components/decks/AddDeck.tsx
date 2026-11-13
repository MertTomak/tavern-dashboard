"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { ClassPortrait } from "@/components/cards/ClassPortrait";
import { CardTile, type TileCard } from "@/components/cards/CardTile";
import { FramePanel } from "@/components/tavern/FramePanel";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { classLabel } from "@/lib/cards/class-colors";
import { DECK_NAME_MAX } from "@/lib/validation/decks";
import { t } from "@/i18n";

type Preview = {
  name: string;
  playerClass: string;
  format: keyof typeof t.filters.formats;
  size: number;
  cards: { dbfId: number; count: number; card: TileCard }[];
  duplicate: string | null;
  sameClass: { id: number; name: string }[];
};

const copy = t.decks;
const NEW = "new";

/** Paste a deck code (it is read as soon as it lands), check the list, name it, save. */
export function AddDeck() {
  const router = useRouter();
  const textId = useId();
  const nameId = useId();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [name, setName] = useState("");
  const [saveAs, setSaveAs] = useState(NEW);
  const [busy, setBusy] = useState<"reading" | "saving" | null>(null);

  async function read(value: string) {
    if (!value.trim()) return toast.error(copy.errors.empty);
    setBusy("reading");
    try {
      const res = await fetch("/api/decks/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: value }) });
      const data = (await res.json()) as Preview & { error?: string };
      if (!res.ok) throw new Error(data.error ?? copy.errors.failed);
      setPreview(data);
      setName(data.name);
      // A list for a deck you already have is most likely its next version.
      const sameName = data.sameClass.find((d) => d.name === data.name);
      setSaveAs(sameName ? String(sameName.id) : NEW);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.errors.failed);
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!preview) return;
    setBusy("saving");
    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, name: name.trim() || preview.name, versionOf: saveAs === NEW ? null : Number(saveAs) }),
      });
      const data = (await res.json()) as { deckId?: number; matched?: number; error?: string };
      if (!res.ok || !data.deckId) throw new Error(data.error ?? copy.errors.failed);
      toast.success(copy.saved(name.trim() || preview.name, data.matched ?? 0));
      router.push(`/decks/${data.deckId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.errors.failed);
      setBusy(null);
    }
  }

  function reset() {
    setPreview(null);
    setText("");
  }

  if (preview) {
    const cls = classLabel(preview.playerClass);
    const target = preview.sameClass.find((d) => String(d.id) === saveAs);
    return (
      <FramePanel title={copy.addTitle} hint={copy.previewMeta(cls, t.filters.formats[preview.format], preview.size)} action={<ClassPortrait cls={preview.playerClass} size={40} />}>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <form
            className="grid content-start gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="grid gap-1.5">
              <label htmlFor={nameId} className="text-sm font-medium text-parchment">
                {copy.nameLabel}
              </label>
              <input
                id={nameId}
                value={name}
                maxLength={DECK_NAME_MAX}
                onChange={(e) => setName(e.target.value)}
                disabled={busy !== null}
                className="font-display h-11 rounded-md border border-brass/30 bg-oak-deep/70 px-3 text-lg text-brass-light outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {preview.sameClass.length > 0 && (
              <div className="grid gap-1.5">
                <span className="text-sm font-medium text-parchment">{copy.saveAs}</span>
                <Select value={saveAs} onValueChange={(v) => setSaveAs(String(v))} disabled={busy !== null}>
                  <SelectTrigger aria-label={copy.saveAs} className="h-9 w-full border-brass/30 bg-oak-deep/70">
                    <SelectValue>{target ? copy.asVersion(target.name) : copy.asNew}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NEW}>{copy.asNew}</SelectItem>
                    {preview.sameClass.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {copy.asVersion(d.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-ink-muted">{copy.versionHint}</p>
              </div>
            )}
            {preview.duplicate && (
              <p role="status" className="rounded-md border border-brass/40 bg-brass/10 px-3 py-2 text-sm text-parchment">
                {copy.duplicateNote(preview.duplicate)}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="lg" className="px-4" disabled={busy !== null || preview.duplicate !== null}>
                {busy === "saving" ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
                {busy === "saving" ? copy.saving : copy.save}
              </Button>
              <Button type="button" size="lg" variant="outline" disabled={busy !== null} onClick={reset}>
                {copy.cancel}
              </Button>
            </div>
            <p className="text-xs text-ink-muted">{copy.matchHint}</p>
          </form>
          <ul className="grid content-start gap-1.5 sm:grid-cols-2" aria-label={t.decks.detail.cards}>
            {[...preview.cards]
              .sort((a, b) => (a.card.cost ?? 0) - (b.card.cost ?? 0) || a.card.name.localeCompare(b.card.name))
              .map((c) => (
              <li key={c.dbfId}>
                <CardTile card={c.card} count={c.count} />
              </li>
            ))}
          </ul>
        </div>
      </FramePanel>
    );
  }

  return (
    <FramePanel title={copy.addTitle} hint={copy.addHint}>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void read(text);
        }}
      >
        <label htmlFor={textId} className="sr-only">
          {copy.pasteLabel}
        </label>
        <textarea
          id={textId}
          value={text}
          rows={3}
          spellCheck={false}
          placeholder={copy.pastePlaceholder}
          disabled={busy !== null}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            if (pasted.trim()) {
              e.preventDefault();
              setText(pasted);
              void read(pasted);
            }
          }}
          className="stat resize-y rounded-md border border-dashed border-brass/40 bg-oak-deep/70 px-3 py-2 text-sm text-parchment outline-none placeholder:text-ink-muted/60 focus-visible:border-solid focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" size="lg" className="w-fit px-4" disabled={busy !== null}>
          {busy === "reading" ? <Loader2 className="animate-spin" aria-hidden /> : <ClipboardPaste aria-hidden />}
          {busy === "reading" ? copy.reading : copy.read}
        </Button>
      </form>
    </FramePanel>
  );
}
