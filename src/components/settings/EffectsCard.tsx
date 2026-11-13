"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { FramePanel } from "@/components/tavern/FramePanel";
import { EFFECTS_LEVELS, type EffectsLevel } from "@/lib/effects";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

/** Settings › Effects: Full / Light / Off for the Overview's visual effects. Saves at once. */
export function EffectsCard({ level }: { level: EffectsLevel }) {
  const router = useRouter();
  const [current, setCurrent] = useState(level);
  const [busy, setBusy] = useState(false);
  const copy = t.settings.effects;

  async function choose(next: EffectsLevel) {
    if (next === current || busy) return;
    const previous = current;
    setCurrent(next);
    setBusy(true);
    try {
      const res = await fetch("/api/preferences/effects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: next }),
      });
      if (!res.ok) throw new Error("request failed");
      toast.success(copy.saved(copy.levels[next].name));
      router.refresh();
    } catch {
      setCurrent(previous);
      toast.error(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FramePanel title={copy.title} hint={copy.description} action={<Sparkles className="size-4 text-brass" aria-hidden />}>
      <div role="radiogroup" aria-label={copy.label} className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {EFFECTS_LEVELS.map((l) => {
          const on = l === current;
          return (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={busy}
              onClick={() => choose(l)}
              className={cn(
                "rounded-md border p-3 text-left outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait",
                on ? "border-brass-light bg-oak-deep shadow-glow" : "border-brass/20 bg-oak-deep/60 hover:border-brass/50",
              )}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden className={cn("size-2.5 rotate-45 rounded-[2px]", on ? "bg-brass-light" : "bg-parchment/20")} />
                <span className={cn("font-semibold", on ? "text-brass-light" : "text-parchment")}>{copy.levels[l].name}</span>
              </span>
              <span className="mt-1 block text-sm text-ink-muted">{copy.levels[l].body}</span>
            </button>
          );
        })}
      </div>
    </FramePanel>
  );
}
