"use client";

import { PREVIEW_GUTTER } from "@/lib/tracker/bridge";
import type { PanelId } from "@/lib/tracker/layout";
import type { TrackerView } from "@/lib/tracker/view";
import { DeckPanel } from "./DeckPanel";
import { OpponentPanel } from "./OpponentPanel";
import { useTracker } from "./use-tracker";

/**
 * One tracker panel filling its own overlay window. Each window is wider than
 * its panel: the clear space on the board side (left of my deck, right of the
 * opponent column) is where a hovered card opens.
 */
export function TrackerPanel({ panel, demo }: { panel: PanelId; demo: TrackerView | null }) {
  const tracker = useTracker(demo);
  return panel === "deck" ? (
    <div data-tracker-overlay className="flex h-dvh justify-end" style={{ paddingLeft: PREVIEW_GUTTER }}>
      <DeckPanel tracker={tracker} />
    </div>
  ) : (
    <div data-tracker-overlay className="flex h-dvh justify-start" style={{ paddingRight: PREVIEW_GUTTER }}>
      <OpponentPanel tracker={tracker} />
    </div>
  );
}
