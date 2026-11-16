"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Pencil, Plus, Swords, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ClassPortrait } from "@/components/cards/ClassPortrait";
import { CardTile } from "@/components/cards/CardTile";
import { FramePanel } from "@/components/tavern/FramePanel";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { t } from "@/i18n";
import { ArchetypeDialog, type ArchetypeDraft, type SignatureCard } from "./ArchetypeDialog";

export type ArchetypeItem = { id: number; name: string; playerClass: string; classLabel: string; minMatches: number; games: number; cards: SignatureCard[] };

const copy = t.archetypes;
/** Signature cards shown on a row before "+n". */
const PREVIEW_CARDS = 4;

/** Settings › Opponent archetypes: the rules that name the decks you meet, with an editor. */
export function ArchetypesCard({ items, classes }: { items: ArchetypeItem[]; classes: { cls: string; label: string }[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ArchetypeDraft | null>(null);
  const [withCode, setWithCode] = useState(false);
  const [deleting, setDeleting] = useState<ArchetypeItem | null>(null);
  const [busy, setBusy] = useState(false);

  const start = (code: boolean) => {
    setWithCode(code);
    setDraft({ id: null, name: "", playerClass: classes[0]?.cls ?? "", minMatches: 2, cards: [] });
  };

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/archetypes/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("request failed");
      toast.success(copy.deleted(deleting.name));
      setDeleting(null);
      router.refresh();
    } catch {
      toast.error(copy.errors.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FramePanel title={copy.title} hint={copy.description} action={<Swords className="size-4 text-brass" aria-hidden />}>
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => start(true)}>
            <ClipboardPaste aria-hidden />
            {copy.fromCode}
          </Button>
          <Button variant="outline" onClick={() => start(false)}>
            <Plus aria-hidden />
            {copy.add}
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-brass/30 bg-oak-deep/50 p-4 text-sm text-ink-muted">{copy.empty}</p>
        ) : (
          <ul className="grid gap-2">
            {items.map((a) => (
              <li key={a.id} className="grid gap-3 rounded-md border border-brass/20 bg-oak-deep/70 p-3 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] md:items-center">
                <div className="flex min-w-0 items-center gap-2.5">
                  <ClassPortrait cls={a.playerClass} size={36} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-parchment">{a.name}</p>
                    <p className="stat truncate text-xs text-ink-muted">
                      {a.classLabel} · {copy.games(formatNumber(a.games))}
                    </p>
                  </div>
                </div>
                <div className="grid min-w-0 gap-1">
                  <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-4" aria-label={copy.signature}>
                    {a.cards.slice(0, PREVIEW_CARDS).map((c) => (
                      <li key={c.dbfId} className="min-w-0">
                        <CardTile card={c.card} className="h-8" />
                      </li>
                    ))}
                  </ul>
                  <p className="stat text-xs text-ink-muted">
                    {copy.rule(a.minMatches, a.cards.length)}
                    {a.cards.length > PREVIEW_CARDS ? ` · +${a.cards.length - PREVIEW_CARDS}` : ""}
                  </p>
                </div>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={copy.edit(a.name)}
                    onClick={() => {
                      setWithCode(false);
                      setDraft({ id: a.id, name: a.name, playerClass: a.playerClass, minMatches: a.minMatches, cards: a.cards });
                    }}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={copy.remove(a.name)} onClick={() => setDeleting(a)}>
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ArchetypeDialog
        draft={draft}
        withCode={withCode}
        classes={classes}
        onClose={() => setDraft(null)}
        onSaved={() => {
          setDraft(null);
          router.refresh();
        }}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleting ? copy.confirmTitle(deleting.name) : ""}</AlertDialogTitle>
            <AlertDialogDescription>{copy.confirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{copy.cancel}</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={remove}>
              {busy ? copy.deleting : copy.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FramePanel>
  );
}
