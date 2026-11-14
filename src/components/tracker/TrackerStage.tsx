"use client";

import { Check, TriangleAlert } from "lucide-react";
import { OPPONENT_STRIP_HEIGHT, TITLE_BAR, defaultPlace, gamePicture, gameZones, intersects, type Rect } from "@/lib/tracker/layout";
import type { TrackerView } from "@/lib/tracker/view";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { DeckPanel } from "./DeckPanel";
import { OpponentPanel } from "./OpponentPanel";
import { useTracker } from "./use-tracker";

const box = (r: Rect): React.CSSProperties => ({ left: r.x, top: r.y, width: r.width, height: r.height });

function Zone({ rect, label, className }: { rect: Rect; label: string; className?: string }) {
  return (
    <div aria-hidden style={box(rect)} className={cn("absolute grid place-items-center rounded-xs border border-dashed border-parchment/25 text-center text-[11px] text-parchment/45", className)}>
      {label}
    </div>
  );
}

/**
 * Browser-only layout check (/overlay?demo=1&screen=1440x900&hs=max): a
 * made-up screen of the given size with outlines for the parts of
 * Hearthstone's screen that matter, and both panels where the Mac app would
 * put them. `windowed` shows the game in a window with a title bar.
 */
export function TrackerStage({ demo, screen, windowed }: { demo: TrackerView; screen: { width: number; height: number }; windowed: boolean }) {
  const copy = t.tracker.stage;
  const tracker = useTracker(demo);
  const area: Rect = windowed
    ? { x: Math.round(screen.width * 0.08), y: 44, width: Math.round(screen.width * 0.8), height: Math.round(screen.width * 0.8 * 0.625) + TITLE_BAR }
    : { x: 0, y: 0, ...screen };
  const titleBar = windowed ? TITLE_BAR : 0;
  const picture = gamePicture(area, titleBar);
  const zones = gameZones(picture);
  const deck = defaultPlace("deck", area, titleBar);
  const opponent = defaultPlace("opponent", area, titleBar);
  const strip = { ...opponent, height: OPPONENT_STRIP_HEIGHT };
  const clear = !intersects(strip, zones.history) && !intersects(strip, zones.opponentHand) && !intersects(strip, zones.opponentName);

  return (
    <div data-tracker-stage className="min-h-dvh bg-background p-4 text-parchment">
      <header className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-display text-xl text-title-gold">{copy.title}</h1>
        <p className="stat text-sm text-ink-muted">
          {screen.width} × {screen.height} · {windowed ? copy.windowed : copy.fullScreen}
        </p>
        <p data-stage-clear={clear} className={cn("flex items-center gap-1 text-sm", clear ? "text-win" : "text-loss")}>
          {clear ? <Check aria-hidden className="size-4" /> : <TriangleAlert aria-hidden className="size-4" />}
          {clear ? copy.clear : copy.overlap}
        </p>
        <p className="w-full text-xs text-ink-muted">{copy.intro}</p>
      </header>

      <div className="relative overflow-hidden rounded-xs border border-brass/30 bg-oak" style={{ width: screen.width, height: screen.height }}>
        <div aria-hidden style={box(area)} className="absolute bg-oak-panel outline outline-parchment/20" />
        {windowed && <div aria-hidden style={box({ ...area, height: TITLE_BAR })} className="absolute bg-parchment/10" />}
        <Zone rect={zones.board} label={copy.board} className="place-items-end pb-10" />
        <Zone rect={zones.history} label={copy.history} className="border-loss/50 [writing-mode:vertical-rl]" />
        <Zone rect={zones.opponentHand} label={copy.opponentHand} className="border-loss/50" />
        <Zone rect={zones.opponentName} label={copy.opponentName} className="border-loss/50" />
        <div className="absolute flex items-start" style={box(opponent)}>
          <OpponentPanel tracker={tracker} />
        </div>
        <div className="absolute flex" style={box(deck)}>
          <DeckPanel tracker={tracker} />
        </div>
      </div>
    </div>
  );
}
