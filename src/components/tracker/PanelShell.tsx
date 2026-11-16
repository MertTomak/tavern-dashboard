"use client";

import { AnimatePresence, motion } from "motion/react";
import { EyeOff, GripVertical, MoveDiagonal } from "lucide-react";
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
  /** Fill the window's height (my deck) or be only as tall as the content, up to the window's height (opponent). */
  fill: boolean;
  children: React.ReactNode;
};

/**
 * The frame both tracker panels share: fades in and out with the game, lets
 * clicks through to the game except over itself, drags by its header, hides
 * with its own button and resizes by the grip in its board-side bottom corner.
 * Both panels look the same; they are told apart by where they sit and by
 * their header.
 */
export function PanelShell({ panel, visible, heading, aside, controls, fill, children }: Props) {
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
            "group/panel relative flex w-full min-w-0 flex-col gap-2 rounded-lg border border-brass/45 bg-oak-deep/93 p-2 text-parchment shadow-panel",
            fill ? "h-full" : "max-h-full",
          )}
        >
          <div className="relative flex items-center gap-1.5 border-b border-brass/25 pb-1.5 select-none">
            <div {...pointerDrag("drag")} title={t.tracker.dragHint} className="flex min-w-0 flex-1 cursor-grab items-center gap-1 active:cursor-grabbing">
              <GripVertical aria-hidden className="size-3.5 shrink-0 text-brass/70" />
              {heading}
            </div>
            {aside}
            <div className="pointer-events-none absolute top-0 right-0 bottom-1.5 flex items-center gap-1 rounded-xs bg-oak-deep py-0.5 pl-1.5 opacity-0 transition-opacity duration-150 group-hover/panel:pointer-events-auto group-hover/panel:opacity-100">
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
              "absolute -bottom-0.5 grid size-5 place-items-center rounded-full text-brass/70 outline-none hover:text-brass-light focus-visible:ring-2 focus-visible:ring-ring",
              mine ? "-left-0.5 cursor-nesw-resize" : "-right-0.5 cursor-nwse-resize",
            )}
          >
            <MoveDiagonal aria-hidden className={cn("size-3", mine && "-scale-x-100")} />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
