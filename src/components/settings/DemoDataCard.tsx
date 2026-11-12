"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Trash2 } from "lucide-react";
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
import { FramePanel } from "@/components/tavern/FramePanel";
import { t } from "@/i18n";
import { formatNumber } from "@/lib/format";

type Props = { games: number; decks: number };

export function DemoDataCard({ games, decks }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const copy = t.settings.demo;
  const g = formatNumber(games);
  const d = formatNumber(decks);
  const hasDemo = games > 0 || decks > 0;

  async function clear() {
    setBusy(true);
    try {
      const res = await fetch("/api/demo", { method: "DELETE" });
      if (!res.ok) throw new Error("request failed");
      const removed = (await res.json()) as { games: number; decks: number };
      toast.success(copy.done(formatNumber(removed.games), formatNumber(removed.decks)));
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FramePanel
      title={copy.title}
      hint={copy.description}
      action={<FlaskConical className="size-4 text-brass" aria-hidden />}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-brass/20 bg-oak-deep/70 p-3">
        <p className="text-sm">{hasDemo ? copy.summary(g, d) : copy.none}</p>
        <Button variant="destructive" disabled={!hasDemo} onClick={() => setOpen(true)}>
          <Trash2 className="size-4" aria-hidden />
          {copy.clear}
        </Button>
      </div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.confirmBody(g, d)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{copy.cancel}</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={clear}>
              {busy ? copy.deleting : copy.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FramePanel>
  );
}
