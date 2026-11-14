"use client";

import { AnimatePresence, motion } from "motion/react";
import { EyeOff, GripVertical, MoveDiagonal, MoveHorizontal } from "lucide-react";
import { TRACKER } from "@/components/motion/timing";
import { trackerBridge } from "@/lib/tracker/bridge";
import type { PanelId } from "@/lib/tracker/layout";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { pointerDrag } from "./use-tracker";

type Props = {
  panel: PanelId;
  visible: boolean;
  /** Left of the header: what this panel is. */
  heading: React.ReactNode;
  /** Right of the header: a few numbers. */
  aside?: React.ReactNode;
  /** Extra controls next to the hide button; they show while the pointer is over the panel. */
  controls?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * The frame both tracker panels share: fades in and out with the game, lets
 * clicks through to the game except over itself, drags by its header, hides
 * with its own button and resizes by its grip. My deck is brass; the opponent
 * is ember, so the two are never mistaken for each other at a glance.
 */
export function PanelShell({ panel, visible, heading, aside, controls, children }: Props) {
  const interactive = (on: boolean) => () => trackerBridge()?.setInteractive(on);
  const mine = panel === "deck";
  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          key={panel}
          aria-label={t.tracker.panels[panel]}
          data-tracker-panel={panel}
          initial={{ opacity: 0, x: mine ? 12 : -12 }}
          animate={{ opacity: 1, x: 0, transition: { duration: TRACKER.fadeIn } }}
          exit={{ opacity: 0, transition: { duration: TRACKER.fadeOut } }}
          onPointerEnter={interactive(true)}
          onPointerLeave={interactive(false)}
          className={cn(
            "group/panel @container relative flex w-full min-w-0 flex-col rounded-lg border bg-oak-deep/93 text-parchment shadow-panel",
            mine ? "h-full gap-2 border-brass/45 p-2" : "max-h-full gap-1 border-ember/55 p-1.5 pt-1",
          )}
        >
          {!mine && <span aria-hidden className="absolute inset-x-3 top-0 h-px bg-linear-to-r from-transparent via-ember-light/80 to-transparent" />}
          <div className={cn("relative flex items-center gap-1.5 select-none", mine && "border-b border-brass/25 pb-1.5")}>
            <div {...pointerDrag("drag")} title={t.tracker.dragHint} className="flex min-w-0 flex-1 cursor-grab items-center gap-1 active:cursor-grabbing">
              <GripVertical aria-hidden className={cn("size-3.5 shrink-0", mine ? "text-brass/70" : "text-ember/80")} />
              {heading}
            </div>
            {aside}
            <div className={cn("pointer-events-none absolute top-0 right-0 flex items-center gap-1 rounded-xs bg-oak-deep py-0.5 pl-1.5 opacity-0 transition-opacity duration-150 group-hover/panel:pointer-events-auto group-hover/panel:opacity-100", mine && "bottom-1.5")}>
              {controls}
              <button
                type="button"
                aria-label={t.tracker.hidePanel}
                title={t.tracker.hidePanel}
                onClick={() => trackerBridge()?.hidePanel()}
                className="grid size-5 place-items-center rounded-xs text-ink-muted outline-none hover:text-parchment focus-visible:ring-2 focus-visible:ring-ring"
              >
                <EyeOff aria-hidden className="size-3.5" />
              </button>
            </div>
          </div>

          {children}

          <button
            type="button"
            aria-label={t.tracker.resize}
            title={t.tracker.resize}
            {...pointerDrag("resize")}
            className={cn(
              "absolute grid place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring",
              mine
                ? "-bottom-0.5 -left-0.5 size-5 cursor-nesw-resize text-brass/70 hover:text-brass-light"
                : "top-1/2 -right-1 h-8 w-3 -translate-y-1/2 cursor-ew-resize text-ember/70 opacity-0 group-hover/panel:opacity-100 hover:text-ember-light",
            )}
          >
            {mine ? <MoveDiagonal aria-hidden className="size-3 -scale-x-100" /> : <MoveHorizontal aria-hidden className="size-3" />}
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
