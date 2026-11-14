"use client";

import { useState } from "react";
import { FileCog, Wrench } from "lucide-react";
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
import type { LogConfigStatus } from "@/lib/logs/log-config-file";
import type { LogConfigChange } from "@/lib/logs/log-config";
import { t } from "@/i18n";

const describe = (c: LogConfigChange) => (c.kind === "add-section" ? t.settings.logConfig.addSection(c.section) : t.settings.logConfig.setKey(c.section, c.key, c.from, c.to));
/** The exact lines the fix writes, shown before the user approves. */
const preview = (c: LogConfigChange) => (c.kind === "add-section" ? c.lines.join("\n") : `[${c.section}]\n${c.key}=${c.to}`);

/** Settings › Game logs: checks log.config and fixes it only after the user approves the shown change. */
export function LogConfigCard({ initial }: { initial: LogConfigStatus }) {
  const copy = t.settings.logConfig;
  const [status, setStatus] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ok = status.changes.length === 0;

  async function apply() {
    setBusy(true);
    try {
      const res = await fetch("/api/log-config", { method: "POST" });
      if (!res.ok) throw new Error("request failed");
      setStatus((await res.json()) as LogConfigStatus);
      toast.success(copy.done);
      setOpen(false);
    } catch {
      toast.error(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FramePanel title={copy.title} hint={copy.description} action={<FileCog className="size-4 text-brass" aria-hidden />}>
      <div className="rounded-md border border-brass/20 bg-oak-deep/70 p-3">
        <p className="flex items-center gap-2 text-sm font-medium" role="status">
          <span aria-hidden className={ok ? "size-2.5 rounded-full bg-win" : "size-2.5 rounded-full bg-tie"} />
          {ok ? copy.ok : status.exists ? copy.needsChanges(status.changes.length) : copy.missingFile}
        </p>
        <p className="mt-1 break-all font-mono text-xs text-ink-muted">{status.path}</p>
        {!ok && (
          <>
            <ul className="mt-3 space-y-1 text-sm">
              {status.changes.map((c) => (
                <li key={describe(c)} className="font-stat">
                  {describe(c)}
                </li>
              ))}
            </ul>
            <Button className="mt-3" onClick={() => setOpen(true)}>
              <Wrench className="size-4" aria-hidden />
              {copy.fix}
            </Button>
          </>
        )}
      </div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.confirmBody(status.path)}</AlertDialogDescription>
          </AlertDialogHeader>
          <pre data-lenis-prevent className="max-h-64 overflow-auto rounded-md border border-brass/20 bg-sunken p-3 font-mono text-xs">
            {status.changes.map(preview).join("\n\n")}
          </pre>
          <p className="text-xs text-ink-muted">{copy.restartNote}</p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{copy.cancel}</AlertDialogCancel>
            <Button disabled={busy} onClick={apply}>
              {busy ? copy.saving : copy.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FramePanel>
  );
}
