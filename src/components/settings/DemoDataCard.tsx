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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { tr } from "@/i18n/tr";

type Props = { games: number; decks: number };

const nf = new Intl.NumberFormat("tr-TR");

export function DemoDataCard({ games, decks }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const t = tr.settings.demo;
  const g = nf.format(games);
  const d = nf.format(decks);
  const hasDemo = games > 0 || decks > 0;

  async function clear() {
    setBusy(true);
    try {
      const res = await fetch("/api/demo", { method: "DELETE" });
      if (!res.ok) throw new Error("request failed");
      const removed = (await res.json()) as { games: number; decks: number };
      toast.success(t.done(nf.format(removed.games), nf.format(removed.decks)));
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(t.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="size-4 text-primary" aria-hidden />
          {t.title}
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">{hasDemo ? t.summary(g, d) : t.none}</p>
        <Button variant="destructive" disabled={!hasDemo} onClick={() => setOpen(true)}>
          <Trash2 className="size-4" aria-hidden />
          {t.clear}
        </Button>
      </CardContent>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirmBody(g, d)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t.cancel}</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={clear}>
              {busy ? t.deleting : t.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
