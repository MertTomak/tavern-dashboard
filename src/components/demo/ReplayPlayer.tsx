"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Pause, Play, RotateCcw } from "lucide-react";
import { ClassPortrait } from "@/components/cards/ClassPortrait";
import { FramePanel } from "@/components/tavern/FramePanel";
import { DeckPanel } from "@/components/tracker/DeckPanel";
import { OpponentPanel } from "@/components/tracker/OpponentPanel";
import { useTracker } from "@/components/tracker/use-tracker";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { classLabel } from "@/lib/cards/class-colors";
import type { ReplayGame } from "@/lib/demo/replay";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

const SPEEDS = [1, 4, 16] as const;
type Speed = (typeof SPEEDS)[number];

/** The newest frame at or before `ms` (frames are in time order). */
function frameAt(game: ReplayGame, ms: number): number {
  let lo = 0;
  let hi = game.frames.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (game.frames[mid].at <= ms) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Plays the recorded games through the real tracker panels: the views were
 * built on the server by the tracker's own code, and are shown here at the
 * moment the log wrote them, at 1×, 4× or 16× speed.
 */
export function ReplayPlayer() {
  const copy = t.replay;
  const [games, setGames] = useState<ReplayGame[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<Speed>(1);
  const last = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/demo/replay")
      .then((res) => (res.ok ? (res.json() as Promise<{ games: ReplayGame[] }>) : Promise.reject(new Error("failed"))))
      .then((data) => !cancelled && setGames(data.games))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const game = games?.[index] ?? null;
  const duration = game?.durationMs ?? 0;

  useEffect(() => {
    if (!playing || !game) return;
    let raf = 0;
    const tick = (now: number) => {
      const dt = last.current === null ? 0 : now - last.current;
      last.current = now;
      setPosition((p) => {
        const next = Math.min(duration, p + dt * speed);
        if (next >= duration) setPlaying(false);
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      last.current = null;
    };
  }, [playing, speed, game, duration]);

  const view = useMemo(() => (game ? game.frames[frameAt(game, position)].view : null), [game, position]);
  const tracker = useTracker(view);

  if (failed) return <p className="text-sm text-loss">{copy.failed}</p>;
  if (!games || !game || !view) {
    return (
      <div aria-busy className="grid gap-4">
        <span className="sr-only">{copy.loading}</span>
        <Skeleton className="h-12 w-full rounded-lg bg-card" />
        <Skeleton className="h-[560px] w-full rounded-lg bg-card" />
      </div>
    );
  }

  const choose = (i: number) => {
    setIndex(i);
    setPosition(0);
    setPlaying(true);
  };
  const toggle = () => {
    if (position >= duration) setPosition(0);
    setPlaying((p) => !p);
  };
  const phase = view.status === "over" ? copy.over : view.turn === 0 ? copy.mulligan : copy.turn(view.turn);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3" data-own-arrows>
        <div role="radiogroup" aria-label={copy.pickGame} className="flex gap-1.5">
          {games.map((g, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={i === index}
              onClick={() => choose(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-xs border px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                i === index ? "border-brass/70 bg-brass/15 text-parchment" : "border-brass/25 text-ink-muted hover:text-parchment",
              )}
            >
              {g.opponent && <ClassPortrait cls={g.opponent} size={18} />}
              {copy.game(i + 1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={toggle} aria-label={playing ? copy.pause : copy.play}>
            {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
            {playing ? copy.pause : copy.play}
          </Button>
          <Button size="icon-sm" variant="outline" onClick={() => choose(index)} aria-label={copy.restart} title={copy.restart}>
            <RotateCcw aria-hidden />
          </Button>
        </div>
        <div role="radiogroup" aria-label={copy.speed} className="flex overflow-hidden rounded-xs border border-brass/35">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={s === speed}
              onClick={() => setSpeed(s)}
              className={cn("stat px-2 py-1 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring", s === speed ? "bg-brass/85 text-oak-deep" : "text-ink-muted hover:text-parchment")}
            >
              {s}×
            </button>
          ))}
        </div>
        <label className="flex min-w-[220px] flex-1 items-center gap-2">
          <span className="sr-only">{copy.position}</span>
          <input
            type="range"
            min={0}
            max={duration}
            step={500}
            value={position}
            onChange={(e) => setPosition(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer accent-brass"
          />
          <span className="stat w-[86px] shrink-0 text-right text-sm text-ink-muted tabular-nums">
            {formatClock(position / 1000)} / {formatClock(duration / 1000)}
          </span>
        </label>
      </div>

      <div className="grid h-[min(640px,calc(100dvh-var(--chrome-h,110px)-220px))] min-h-[480px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)_minmax(0,240px)]">
        <div className="flex min-h-0 items-start">
          <OpponentPanel tracker={tracker} />
        </div>
        <FramePanel className="hidden min-h-0 md:block">
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                {view.me.cls && <ClassPortrait cls={view.me.cls} size={44} />}
                <span className="font-display text-xl text-title-gold">{view.me.cls && view.opponent.cls ? copy.vs(classLabel(view.me.cls), classLabel(view.opponent.cls)) : "…"}</span>
                {view.opponent.cls && <ClassPortrait cls={view.opponent.cls} size={44} />}
              </div>
              <p className="stat text-4xl font-bold text-brass-bright" aria-live="polite">
                {phase}
              </p>
            </div>
            <div className="grid gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-parchment">
                <Eye aria-hidden className="size-4 text-brass" />
                {copy.fairPlayTitle}
              </h2>
              <ul className="grid list-disc gap-1 pl-5 text-sm text-ink-muted">
                {copy.fairPlay.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </FramePanel>
        <div className="flex min-h-0">
          <DeckPanel tracker={tracker} />
        </div>
      </div>
    </div>
  );
}
