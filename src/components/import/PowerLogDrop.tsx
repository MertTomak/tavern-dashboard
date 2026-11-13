"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileUp, FolderOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { ResultChip } from "@/components/dashboard/ResultMark";
import { FramePanel } from "@/components/tavern/FramePanel";
import { classLabel } from "@/lib/cards/class-colors";
import { formatDuration, formatShortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

type PreviewGame = {
  sourceHash: string;
  startedAt: string;
  mode: keyof typeof t.filters.modes;
  format: keyof typeof t.filters.formats | null;
  result: "WIN" | "LOSS" | "TIE";
  conceded: "FRIENDLY" | "OPPOSING" | null;
  playerClass: string;
  opponentClass: string;
  wentFirst: boolean | null;
  turns: number;
  durationSec: number;
  duplicate: boolean;
};
type Preview = { token: string; fileName: string; games: PreviewGame[]; unreadable: number; battlegrounds: number };
type Stage =
  | { kind: "idle" }
  | { kind: "reading"; name: string }
  | { kind: "preview"; preview: Preview }
  | { kind: "importing"; preview: Preview }
  | { kind: "done"; imported: number; skipped: number };

const copy = t.importLog;

/** A dropped item: a Power.log file, or a session folder that contains one (its name dates the games exactly). */
async function fromDrop(items: DataTransferItemList | null, files: FileList | null): Promise<{ file: File; folder: string } | null> {
  const entry = items?.[0]?.webkitGetAsEntry?.();
  if (entry?.isDirectory) {
    const dir = entry as FileSystemDirectoryEntry;
    const children = await new Promise<FileSystemEntry[]>((resolve, reject) => dir.createReader().readEntries(resolve, reject));
    const log = children.find((c) => c.isFile && c.name.toLowerCase() === "power.log") as FileSystemFileEntry | undefined;
    if (!log) return null;
    const file = await new Promise<File>((resolve, reject) => log.file(resolve, reject));
    return { file, folder: dir.name };
  }
  const file = files?.[0];
  return file ? { file, folder: "" } : null;
}

/**
 * Step one of an import: drop a Power.log (or its session folder), read it on
 * the server, and show every game found with the ones already saved marked.
 * Nothing is saved until the user confirms.
 */
export function PowerLogDrop() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [over, setOver] = useState(false);

  async function read(file: File, folder: string) {
    setStage({ kind: "reading", name: folder ? `${folder}/${file.name}` : file.name });
    const body = new FormData();
    body.set("file", file);
    body.set("folder", folder);
    body.set("lastModified", String(file.lastModified));
    try {
      const res = await fetch("/api/import/power-log/preview", { method: "POST", body });
      const data = (await res.json()) as Omit<Preview, "fileName"> & { error?: string };
      if (!res.ok) throw new Error(data.error ?? copy.failed);
      setStage({ kind: "preview", preview: { ...data, fileName: file.name } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.failed);
      setStage({ kind: "idle" });
    }
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setOver(false);
    const dropped = await fromDrop(e.dataTransfer.items, e.dataTransfer.files);
    if (!dropped) return toast.error(copy.notLog);
    void read(dropped.file, dropped.folder);
  }

  async function confirm(preview: Preview) {
    setStage({ kind: "importing", preview });
    try {
      const res = await fetch("/api/import/power-log/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: preview.token }),
      });
      const data = (await res.json()) as { imported: number; skipped: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? copy.failed);
      setStage({ kind: "done", imported: data.imported, skipped: data.skipped });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.failed);
      setStage({ kind: "preview", preview });
    }
  }

  if (stage.kind === "preview" || stage.kind === "importing") {
    const { preview } = stage;
    const fresh = preview.games.filter((g) => !g.duplicate).length;
    return (
      <FramePanel
        title={preview.games.length ? copy.previewTitle(preview.games.length) : copy.previewNone}
        hint={preview.games.length ? `${preview.fileName} · ${copy.previewHint(fresh, preview.games.length - fresh)}` : preview.fileName}
      >
        {preview.games.length > 0 && <PreviewList games={preview.games} />}
        {(preview.unreadable > 0 || preview.battlegrounds > 0) && (
          <p className="mt-3 text-sm text-ink-muted">
            {[preview.unreadable ? copy.unreadable(preview.unreadable) : "", preview.battlegrounds ? copy.battlegrounds(preview.battlegrounds) : ""].filter(Boolean).join(" ")}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button size="lg" disabled={!fresh || stage.kind === "importing"} onClick={() => confirm(preview)}>
            {stage.kind === "importing" ? <Loader2 className="animate-spin" aria-hidden /> : <FileUp aria-hidden />}
            {stage.kind === "importing" ? copy.importing : fresh ? copy.confirm(fresh) : copy.nothingNew}
          </Button>
          <Button size="lg" variant="outline" disabled={stage.kind === "importing"} onClick={() => setStage({ kind: "idle" })}>
            {copy.cancel}
          </Button>
        </div>
      </FramePanel>
    );
  }

  return (
    <FramePanel>
      {stage.kind === "done" && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-win/40 bg-win/10 px-4 py-3">
          <p className="font-semibold text-parchment">{copy.done(stage.imported, stage.skipped)}</p>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            {copy.toOverview}
          </Link>
        </div>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center gap-3 rounded-md border-2 border-dashed px-6 py-12 text-center transition-colors duration-200",
          over ? "border-brass-light bg-brass/10" : "border-brass/30 bg-oak-deep/60",
        )}
      >
        {stage.kind === "reading" ? (
          <>
            <Loader2 className="size-8 animate-spin text-brass" aria-hidden />
            <p role="status" className="text-parchment">
              {copy.reading(stage.name)}
            </p>
          </>
        ) : (
          <>
            <FolderOpen className="size-8 text-brass" aria-hidden />
            <p className="font-display text-2xl font-semibold text-title-gold">{over ? copy.dropHere : copy.dropTitle}</p>
            <p className="max-w-[60ch] text-sm text-ink-muted">{copy.dropBody}</p>
            <p className="stat text-xs text-ink-muted [overflow-wrap:anywhere]">{copy.where}</p>
            <Button size="lg" className="mt-2" onClick={() => input.current?.click()}>
              <FileUp aria-hidden />
              {copy.choose}
            </Button>
            <input
              ref={input}
              type="file"
              accept=".log,text/plain"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void read(file, "");
              }}
            />
          </>
        )}
      </div>
    </FramePanel>
  );
}

/** The games found: a row per game on wide screens, two lines per game on phones. */
function PreviewList({ games }: { games: PreviewGame[] }) {
  const c = copy.columns;
  return (
    <div role="table" aria-label={copy.previewTitle(games.length)} className="text-sm">
      <div role="row" className="stat hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,0.5fr)_minmax(0,0.7fr)_minmax(0,1fr)] gap-3 border-b border-brass/20 pb-2 text-xs tracking-[0.08em] text-ink-muted uppercase md:grid">
        {[c.when, c.mode, c.classes, c.result, c.first, c.turns, c.duration, ""].map((h, i) => (
          <span key={i} role="columnheader">
            {h}
          </span>
        ))}
      </div>
      <ol>
        {games.map((g) => (
          <li
            key={g.sourceHash}
            role="row"
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-brass/10 py-2.5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,0.5fr)_minmax(0,0.7fr)_minmax(0,1fr)]",
              g.duplicate && "opacity-55",
            )}
          >
            <span role="cell" className="stat text-parchment">
              {formatShortDateTime(g.startedAt)}
            </span>
            <span role="cell" className="text-ink-muted md:order-none">
              {t.filters.modes[g.mode]}
              {g.format ? ` · ${t.filters.formats[g.format]}` : ""}
            </span>
            <span role="cell" className="text-parchment">
              {classLabel(g.playerClass)} {t.concepts.vs} {classLabel(g.opponentClass)}
            </span>
            <span role="cell" className="flex items-center gap-2">
              <ResultChip result={g.result} />
              {g.conceded && <span className="text-xs text-ink-muted">{copy.conceded[g.conceded]}</span>}
            </span>
            <span role="cell" className="stat text-ink-muted">
              {g.wentFirst === null ? "–" : g.wentFirst ? copy.first : copy.coin}
            </span>
            <span role="cell" className="stat text-ink-muted">
              {g.turns}
            </span>
            <span role="cell" className="stat text-ink-muted">
              {formatDuration(g.durationSec)}
            </span>
            <span role="cell">{g.duplicate && <span className="rounded-xs border border-brass/30 px-2 py-0.5 text-xs text-ink-muted">{copy.duplicate}</span>}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
