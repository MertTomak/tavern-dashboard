"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { classLabel } from "@/lib/cards/class-colors";
import { t } from "@/i18n";

type Target = { id: string; playerClass: string; opponentClass: string; when: string };

/** Confirms and deletes one game. `afterDelete` lets the breakdown page go back to the list. */
export function DeleteGameDialog({ game, onClose, afterDelete }: { game: Target | null; onClose: () => void; afterDelete?: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove(g: Target) {
    setBusy(true);
    try {
      const res = await fetch(`/api/games/${g.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? t.games.deleteFailed);
      }
      toast.success(t.games.deleted);
      onClose();
      if (afterDelete) afterDelete();
      else router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.games.deleteFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={game !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.games.deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {game ? t.games.deleteBody(t.gameDetail.vs(classLabel(game.playerClass), classLabel(game.opponentClass)), game.when) : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t.games.cancel}</AlertDialogCancel>
          <Button variant="destructive" disabled={busy} onClick={() => game && remove(game)}>
            {t.games.deleteConfirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
