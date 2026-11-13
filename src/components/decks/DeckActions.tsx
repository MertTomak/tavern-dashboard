"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { t } from "@/i18n";

const copy = t.decks.detail;

/** Copy the deck code back to the game, or delete the deck (asked first). */
export function DeckActions({ id, name, deckstring, games }: { id: number; name: string; deckstring: string; games: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(deckstring);
      toast.success(copy.copied);
    } catch {
      toast.error(copy.copyFailed);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/decks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? t.decks.deleteFailed);
      }
      toast.success(copy.deleted);
      setOpen(false);
      router.push("/decks");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.decks.deleteFailed);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="lg" className="px-4" onClick={copyCode}>
        <Copy aria-hidden />
        {copy.copy}
      </Button>
      <Button size="lg" variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden />
        {copy.delete}
      </Button>
      <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.deleteBody(name, games)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t.decks.cancel}</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={remove}>
              {copy.delete}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
