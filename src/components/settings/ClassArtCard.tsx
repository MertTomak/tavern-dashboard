"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Palette } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FramePanel } from "@/components/tavern/FramePanel";
import { ArtCrop } from "@/components/tavern/ArtCrop";
import type { ClassArtOption } from "@/lib/cards/catalog";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export type ClassArtRow = { cls: string; label: string; current: string; chosen: boolean; options: ClassArtOption[] };

/** Settings: pick the portrait for each class (newest legendary by default, or any hero skin). */
export function ClassArtCard({ rows }: { rows: ClassArtRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const copy = t.settings.classArt;
  const row = rows.find((r) => r.cls === open);

  async function choose(cls: string, label: string, cardId: string | null) {
    setSaving(true);
    try {
      const res = await fetch("/api/preferences/class-art", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cls, cardId }),
      });
      if (!res.ok) throw new Error("request failed");
      toast.success(copy.saved(label));
      setOpen(null);
      router.refresh();
    } catch {
      toast.error(copy.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FramePanel title={copy.title} hint={copy.description} action={<Palette className="size-4 text-brass" aria-hidden />}>
      <ul className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 lg:grid-cols-6">
        {rows.map((r) => (
          <li key={r.cls}>
            <button
              type="button"
              onClick={() => setOpen(r.cls)}
              aria-label={copy.choose(r.label)}
              className="group flex w-full flex-col items-center gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="relative block size-20 overflow-hidden rounded-full ring-2 ring-brass/60 transition-shadow duration-200 group-hover:shadow-glow">
                <ArtCrop cardId={r.current} focus="face" zoom={1.25} />
              </span>
              <span className="text-sm text-parchment">{r.label}</span>
              <span className="stat text-xs text-ink-muted">{r.chosen ? r.options.find((o) => o.id === r.current)?.name : copy.defaultBadge}</span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="brass-frame max-h-[85vh] overflow-y-auto [--frame-fill:#1a130e] sm:max-w-3xl">
          {row && (
            <>
              <DialogTitle className="font-display text-2xl text-title-gold">{copy.choose(row.label)}</DialogTitle>
              <DialogDescription className="text-ink-muted">{copy.options(formatNumber(row.options.length))}</DialogDescription>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {row.options.map((o) => {
                  const selected = o.id === row.current;
                  return (
                    <li key={o.id}>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => choose(row.cls, row.label, o.kind === "newest" ? null : o.id)}
                        aria-pressed={selected}
                        className={cn(
                          "group relative block w-full overflow-hidden rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected ? "ring-2 ring-brass-light" : "ring-1 ring-brass/25",
                        )}
                      >
                        <span className="block aspect-square">
                          <ArtCrop cardId={o.id} focus="face" />
                        </span>
                        <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 to-transparent px-2 pt-6 pb-1.5">
                          <span className="block truncate text-xs font-medium text-white">{o.name}</span>
                          <span className="stat block text-[10px] tracking-[0.08em] text-brass-dim uppercase">{copy.kinds[o.kind]}</span>
                        </span>
                        {selected && (
                          <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-brass-light text-oak">
                            <Check className="size-3.5" aria-hidden />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>
    </FramePanel>
  );
}
