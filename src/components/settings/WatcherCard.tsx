"use client";

import { useEffect, useState } from "react";
import { Radar } from "lucide-react";
import { z } from "zod";
import { FramePanel } from "@/components/tavern/FramePanel";
import { classLabel } from "@/lib/cards/class-colors";
import { formatShortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

const statusSchema = z.object({
  watcher: z.object({ owner: z.string(), logRoot: z.string().nullable(), file: z.string().nullable(), running: z.boolean() }).nullable(),
  lastGame: z.object({ savedAt: z.string(), playerClass: z.string(), opponentClass: z.string(), result: z.enum(["WIN", "LOSS", "TIE"]) }).nullable(),
});
type Status = z.infer<typeof statusSchema>;

const POLL_MS = 10_000;

/** Settings › Log watcher: is it running, where it reads, the last game it saved. Refreshes itself. */
export function WatcherCard({ initial }: { initial: Status }) {
  const copy = t.settings.watcher;
  const [status, setStatus] = useState<Status>(initial);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/watcher/status", { cache: "no-store" });
        if (res.ok) setStatus(statusSchema.parse(await res.json()));
      } catch {
        // Keep the last known status.
      }
    };
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const w = status.watcher;
  const g = status.lastGame;
  const rows: [string, string][] = w
    ? [
        [copy.owner, w.owner],
        [copy.folder, w.logRoot ?? copy.unknownFolder],
        [copy.file, w.file ? w.file.split("/").slice(-2).join("/") : w.logRoot ? copy.noFile : copy.unknownFolder],
      ]
    : [];
  rows.push([copy.lastGame, g ? copy.lastGameValue(`${classLabel(g.playerClass)} vs ${classLabel(g.opponentClass)} — ${t.overview.result[g.result]}`, formatShortDateTime(g.savedAt)) : copy.noGame]);

  return (
    <FramePanel title={copy.title} hint={copy.description} action={<Radar className="size-4 text-brass" aria-hidden />}>
      <div className="rounded-md border border-brass/20 bg-oak-deep/70 p-3">
        <p className="flex items-center gap-2 text-sm font-medium" role="status">
          <span aria-hidden className={cn("size-2.5 rounded-full", w ? "bg-win shadow-glow" : "bg-loss")} />
          {w ? copy.running : copy.stopped}
        </p>
        {!w && <p className="mt-1 text-xs text-ink-muted">{copy.stoppedHint}</p>}
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ink-muted">{k}</dt>
              <dd className="min-w-0 break-words font-stat">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </FramePanel>
  );
}
