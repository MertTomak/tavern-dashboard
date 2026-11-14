"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { GripVertical, MoveDiagonal } from "lucide-react";
import { TRACKER } from "@/components/motion/timing";
import { PREVIEW_GUTTER, trackerBridge, type PointerPhase } from "@/lib/tracker/bridge";
import { EMPTY_VIEW, type TrackerView } from "@/lib/tracker/view";
import { t } from "@/i18n";
import { DeckPanel } from "./DeckPanel";
import { OpponentPanel } from "./OpponentPanel";

/** Sends pointer moves to the app while a drag or resize is held (the window has no frame of its own). */
function pointerDrag(kind: "drag" | "resize") {
  const send = (phase: PointerPhase, x: number, y: number) => trackerBridge()?.[kind](phase, x, y);
  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (!trackerBridge() || e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      send("start", e.screenX, e.screenY);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) send("move", e.screenX, e.screenY);
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      send("end", e.screenX, e.screenY);
    },
  };
}

/**
 * The deck tracker panel inside the overlay window. Opponent on top (their
 * side of the board), my deck below. Shows only the fair-play view the app
 * sends. In a browser, `demo` shows a made-up game to check the look.
 */
export function TrackerOverlay({ demo }: { demo: TrackerView | null }) {
  const [view, setView] = useState<TrackerView>(demo ?? EMPTY_VIEW);
  const [lingering, setLingering] = useState(false);
  useEffect(() => {
    if (demo) return;
    return trackerBridge()?.onView(setView);
  }, [demo]);

  // After the game ends the final state stays readable for a few seconds, then fades.
  useEffect(() => {
    if (view.status !== "over") return;
    queueMicrotask(() => setLingering(true));
    const timer = setTimeout(() => setLingering(false), TRACKER.lingerAfterGame * 1000);
    return () => clearTimeout(timer);
  }, [view.status]);

  const visible = view.status === "playing" || (view.status === "over" && lingering) || !!demo;
  const interactive = (on: boolean) => () => trackerBridge()?.setInteractive(on);

  return (
    <div data-tracker-overlay className="flex h-dvh justify-end" style={{ paddingLeft: PREVIEW_GUTTER }}>
      <AnimatePresence>
        {visible && (
          <motion.aside
            key="tracker"
            aria-label={t.tracker.title}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0, transition: { duration: TRACKER.fadeIn } }}
            exit={{ opacity: 0, transition: { duration: TRACKER.fadeOut } }}
            onPointerEnter={interactive(true)}
            onPointerLeave={interactive(false)}
            className="relative flex h-full w-full min-w-0 flex-col gap-2.5 rounded-lg border border-brass/45 bg-oak-deep/93 p-2 text-parchment shadow-panel"
          >
            <div
              {...pointerDrag("drag")}
              title={t.tracker.dragHint}
              className="flex cursor-grab items-center justify-between gap-2 border-b border-brass/25 pb-1.5 select-none active:cursor-grabbing"
            >
              <span className="flex items-center gap-1 text-[10.5px] tracking-wide text-ink-muted uppercase">
                <GripVertical aria-hidden className="size-3.5 text-brass/70" />
                {view.status === "over" ? t.tracker.gameOver : t.tracker.title}
              </span>
              <span className="stat text-[13px] font-bold text-brass-light">{t.tracker.turn(view.turn)}</span>
            </div>

            {view.status === "waiting" ? (
              <p className="px-1 text-[12px] text-ink-muted">{t.tracker.waiting}</p>
            ) : (
              <>
                <OpponentPanel view={view} />
                <div aria-hidden className="h-px shrink-0 bg-linear-to-r from-transparent via-brass/50 to-transparent" />
                <DeckPanel view={view} />
              </>
            )}

            <button
              type="button"
              aria-label={t.tracker.resize}
              {...pointerDrag("resize")}
              className="absolute -bottom-0.5 -left-0.5 grid size-5 cursor-nesw-resize place-items-center rounded-full text-brass/70 outline-none hover:text-brass-light focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoveDiagonal aria-hidden className="size-3 -scale-x-100" />
            </button>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
