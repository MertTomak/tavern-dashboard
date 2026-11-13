"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { History, Undo2 } from "lucide-react";
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
import { formatShortDateTime } from "@/lib/format";
import { t } from "@/i18n";

export type BatchRow = { id: number; source: keyof typeof t.importLog.sources; fileName: string | null; imported: number; skipped: number; remaining: number; createdAt: string };

const copy = t.importLog;

/** Past imports with a one-click undo (confirmed in a dialog; only that import's games go). */
export function ImportHistory({ batches }: { batches: BatchRow[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<BatchRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function undo(batch: BatchRow) {
    setBusy(true);
    try {
      const res = await fetch(`/api/import/batches/${batch.id}`, { method: "DELETE" });
      const data = (await res.json()) as { removed?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? copy.undoFailed);
      toast.success(copy.undone(data.removed ?? 0));
      setTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.undoFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FramePanel title={copy.historyTitle} hint={copy.historyHint} action={<History className="size-4 text-brass" aria-hidden />}>
      {batches.length === 0 ? (
        <p className="text-sm text-ink-muted">{copy.historyEmpty}</p>
      ) : (
        <ul className="divide-y divide-brass/10">
          {batches.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-parchment">{b.fileName ?? copy.sources[b.source]}</p>
                <p className="stat text-sm text-ink-muted">
                  {formatShortDateTime(b.createdAt)} · {copy.sources[b.source]} · {copy.historyRow(b.imported, b.skipped)}
                  {b.remaining < b.imported ? ` · ${b.imported - b.remaining} ${copy.removed}` : ""}
                </p>
              </div>
              <Button variant="outline" disabled={b.remaining === 0} onClick={() => setTarget(b)}>
                <Undo2 aria-hidden />
                {copy.undo}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <AlertDialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.undoTitle}</AlertDialogTitle>
            <AlertDialogDescription>{target ? copy.undoBody(target.remaining, target.fileName ?? copy.sources[target.source]) : ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{copy.cancel}</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={() => target && undo(target)}>
              {copy.undoConfirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FramePanel>
  );
}
