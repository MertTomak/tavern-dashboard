"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { artSrc } from "@/lib/cards/art";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { ArtCrop } from "../ArtCrop";
import { useChapter } from "../journey/reveal";
import type { CardBackData } from "./card-faces";
import type { CardControls } from "./CardScene";

// three.js loads only when the 3D card is actually used.
const CardScene = dynamic(() => import("./CardScene"), { ssr: false });

let webglSupport: boolean | null = null;
function hasWebGL(): boolean {
  if (webglSupport === null) {
    try {
      const c = document.createElement("canvas");
      webglSupport = !!(c.getContext("webgl2") ?? c.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noop = () => () => {};

type Props = {
  cardId: string;
  data: CardBackData;
  className?: string;
};

/**
 * Today's featured card as an interactive 3D card (React Three Fiber). Drag to
 * turn it (with inertia), click to flip, arrow keys / Enter from the keyboard,
 * horizontal drag on touch (vertical drag still scrolls). Without WebGL or with
 * Reduce motion it stays the flat 2D art. As the hero leaves in the journey, the
 * front art melts into vertical streaks. The canvas pauses while off screen.
 */
export function HeroCard({ cardId, data, className }: Props) {
  const reduce = useReducedMotion();
  const webgl = useSyncExternalStore(noop, hasWebGL, () => false);
  const use3d = webgl && !reduce;
  const wrap = useRef<HTMLDivElement>(null);
  const controls = useRef<CardControls>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const { scrollY } = useScroll();
  // In the journey the hero stays in the layout while other chapters cover it: pause once it has fully left.
  const { offset } = useChapter();
  const [onStage, setOnStage] = useState(true);
  useMotionValueEvent(offset, "change", (o) => setOnStage(o > -0.999));

  useEffect(() => {
    const el = wrap.current;
    if (!el || !use3d) return;
    const io = new IntersectionObserver(([entry]) => setVisible(!!entry?.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [use3d]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const c = controls.current;
    if (!c) return;
    const spin: Record<string, [number, number]> = { ArrowLeft: [0, -3.2], ArrowRight: [0, 3.2], ArrowUp: [-2.4, 0], ArrowDown: [2.4, 0] };
    const s = spin[e.key];
    if (s) c.nudge(s[0], s[1]);
    else if (e.key === "Enter" || e.key === " ") c.flip();
    else return;
    // The arrows belong to the card here, not to page switching.
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div ref={wrap} className={cn("relative", className)}>
      {/* The flat art: shown without 3D, and underneath until the 3D card has drawn. */}
      <div
        aria-hidden={use3d}
        className={cn(
          "absolute inset-0 transition-opacity duration-300 [mask-image:linear-gradient(to_right,transparent,black_30%),linear-gradient(to_top,transparent,black_30%)] [mask-composite:intersect]",
          ready && "opacity-0",
        )}
      >
        <ArtCrop cardId={cardId} alt={use3d ? "" : data.name} priority />
      </div>
      {use3d && (
        <div
          role="button"
          tabIndex={0}
          aria-label={t.card3d.label(data.name)}
          aria-roledescription="3D card"
          onKeyDown={onKeyDown}
          data-own-arrows
          data-swipe-ignore
          data-lenis-prevent
          className={cn("absolute inset-0 rounded-lg outline-none select-none transition-opacity duration-500 focus-visible:ring-2 focus-visible:ring-ring", ready ? "opacity-100" : "opacity-0")}
        >
          <CardScene
            ref={controls}
            artUrl={artSrc("art", cardId)}
            data={data}
            running={visible && onStage}
            onReady={() => setReady(true)}
            scrollTurn={() => scrollY.get() * 0.0009}
            // The art melts during the first part of the strip transition, before its strip is gone.
            melt={() => -offset.get() * 1.6}
          />
          <p className="stat pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs tracking-[0.12em] text-brass-dim uppercase [text-shadow:0_1px_6px_#000]">
            {t.card3d.flipHint}
          </p>
        </div>
      )}
    </div>
  );
}
