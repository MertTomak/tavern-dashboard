"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import { useLenis } from "lenis/react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { ArtCrop } from "../ArtCrop";
import { ChapterProvider, useJourneyEnabled } from "./reveal";
import { ScrollVelocityProvider } from "./velocity";
import { StreakArt } from "./StreakArt";
import { clamp, held, HOLD, stripClip } from "./geometry";

export type Chapter = {
  id: string;
  label: string;
  /** Card art behind the chapter (dimmed, drifts with the scroll for depth). */
  art?: string | null;
  /** The art forms back from vertical streaks as the chapter arrives (answers the hero card's melt). */
  streakIn?: boolean;
  children: React.ReactNode;
};

/** A chapter arrives as soon as the strips start uncovering it, so its entrance is done by the time it rests centred. */
const ARRIVE_EARLY = 1 - HOLD;
/** Vertical scroll per chapter, as a share of the viewport height. */
const SCROLL_PER_CHAPTER = 1;
/** How far the outgoing chapter slides left, and the incoming one waits to the right (share of the width). */
const OUT_SHIFT = 18;
const IN_SHIFT = 8;

/** Scroll geometry of the journey: where it starts and how far it scrolls, re-measured on resize. */
function useGeometry(outer: React.RefObject<HTMLDivElement | null>) {
  const geo = useRef({ start: 0, range: 1 });
  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const measure = () => {
      const chrome = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--chrome-h")) || 0;
      const top = el.getBoundingClientRect().top + window.scrollY;
      geo.current = { start: top - chrome, range: Math.max(1, el.offsetHeight - (window.innerHeight - chrome)) };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [outer]);
  return geo;
}

/** Chapter art is a dim, soft backdrop: it sets the scene without competing with the data. */
const ART_LOOK = "scale-125 opacity-45 blur-[3px] brightness-[0.45] saturate-[0.85]";

function ChapterPanel({
  chapter,
  index,
  pos,
  raw,
  journey,
  arrived,
  onFocus,
}: {
  chapter: Chapter;
  index: number;
  pos: MotionValue<number>;
  raw: MotionValue<number>;
  journey: boolean;
  arrived: boolean;
  onFocus: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  // 0 when centred (and resting), +1 next in line on the right, -1 gone to the left.
  const offset = useTransform(pos, (p) => clamp(index - p, -1, 1));
  const drift = useTransform(raw, (p) => clamp(index - p, -1.5, 1.5));
  const value = useMemo(() => ({ revealed: journey ? arrived : inView, offset, drift }), [journey, arrived, inView, offset, drift]);

  // The outgoing chapter lies on top and leaves in strips; the next one waits underneath, dimmed and set back.
  const x = useTransform(offset, (o) => `${o < 0 ? o * OUT_SHIFT : o * IN_SHIFT}%`);
  const scale = useTransform(offset, (o) => (o > 0 ? 1 - o * 0.05 : 1));
  const clipPath = useTransform(offset, (o) => (o < 0 ? stripClip(-o) : "none"));
  const zIndex = useTransform(offset, (o) => (o <= 0 ? 2 : 1));
  const opacity = useTransform(offset, (o) => (Math.abs(o) >= 1 ? 0 : 1));
  const pointerEvents = useTransform(offset, (o) => (Math.abs(o) < 0.5 ? "auto" : "none"));
  const shade = useTransform(offset, (o) => (o > 0 ? o * 0.75 : 0));
  const artX = useTransform(drift, (o) => `${o * 14}%`);
  // Streaked while the chapter waits underneath, whole by the time most strips have gone.
  const artForm = useTransform(offset, (o) => clamp(o * 1.6 - 0.3, 0, 1));

  return (
    <motion.section
      ref={ref}
      id={`chapter-${chapter.id}`}
      aria-label={chapter.label}
      onFocusCapture={onFocus}
      className="relative isolate overflow-clip bg-background journey:absolute journey:inset-0"
      style={journey ? { x, scale, clipPath, zIndex, opacity, pointerEvents } : undefined}
    >
      {chapter.art && (
        <motion.div
          aria-hidden
          className="absolute -inset-y-10 -inset-x-[18%] -z-10 [mask-image:linear-gradient(to_right,transparent_8%,black_32%,black_68%,transparent_92%)]"
          style={journey ? { x: artX } : undefined}
        >
          {journey && chapter.streakIn ? (
            <StreakArt cardId={chapter.art} form={artForm} className={ART_LOOK} />
          ) : (
            <ArtCrop cardId={chapter.art} className={ART_LOOK} />
          )}
          <span className="absolute inset-0 bg-[radial-gradient(ellipse_70%_65%_at_50%_45%,#120d0a99,#120d0a_80%)]" />
        </motion.div>
      )}
      <ChapterProvider value={value}>{chapter.children}</ChapterProvider>
      {journey && <motion.span aria-hidden className="pointer-events-none absolute inset-0 z-10 bg-oak-deep" style={{ opacity: shade }} />}
    </motion.section>
  );
}

/**
 * The Overview as a journey. Normal vertical scrolling moves through a pinned
 * stage of full-height chapters. Each chapter rests centred for a moment, then
 * splits into horizontal strips that slide away at different speeds and reveal
 * the next one, which waits underneath. Scroll-scrubbed and reversible, no
 * snapping. Each chapter's entrance plays once as it arrives. A brass chapter
 * rail jumps between chapters. Phones and Reduce motion get a normal vertical page.
 */
export function OverviewJourney({ chapters }: { chapters: Chapter[] }) {
  const journey = useJourneyEnabled();
  const outer = useRef<HTMLDivElement>(null);
  const geo = useGeometry(outer);
  const lenis = useLenis();
  const n = chapters.length;

  const { scrollY } = useScroll();
  const raw = useTransform(scrollY, (y) => clamp((y - geo.current.start) / geo.current.range, 0, 1) * (n - 1));
  const pos = useTransform(raw, (p) => held(p, n - 1));

  const [arrived, setArrived] = useState(0);
  const [current, setCurrent] = useState(0);
  useMotionValueEvent(raw, "change", (p) => {
    setCurrent(Math.round(held(p, n - 1)));
    setArrived((a) => Math.max(a, Math.floor(p + ARRIVE_EARLY)));
  });

  const jump = (i: number) => {
    if (journey) {
      const y = geo.current.start + (geo.current.range * i) / (n - 1);
      if (lenis) lenis.scrollTo(y, { duration: 1.1 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    } else {
      document.getElementById(`chapter-${chapters[i]?.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <ScrollVelocityProvider horizontal={journey} enabled>
      <div
        ref={outer}
        className="relative journey:h-[calc((var(--n)-1)*var(--per)*100dvh+100dvh)]"
        style={{ ["--n" as string]: n, ["--per" as string]: SCROLL_PER_CHAPTER }}
      >
        <div className="journey:sticky journey:top-(--chrome-h) journey:h-[calc(100dvh-var(--chrome-h))] journey:overflow-clip">
          <div className="flex flex-col gap-10 journey:relative journey:block journey:h-full">
            {chapters.map((c, i) => (
              <ChapterPanel
                key={c.id}
                chapter={c}
                index={i}
                pos={pos}
                raw={raw}
                journey={journey}
                arrived={i <= arrived}
                // Tabbing into a chapter that is not on screen brings it there.
                onFocus={() => journey && i !== current && jump(i)}
              />
            ))}
          </div>

          <nav aria-label={t.journey.chapters} className="pointer-events-none absolute inset-x-0 bottom-4 z-20 hidden justify-center journey:flex">
            <ol className="pointer-events-auto flex items-center gap-1 rounded-full border border-brass/25 bg-oak-deep/85 px-2 py-1.5 shadow-panel backdrop-blur-md">
              {chapters.map((c, i) => {
                const active = i === current;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => jump(i)}
                      aria-label={t.journey.goTo(c.label)}
                      aria-current={active ? "step" : undefined}
                      className="group flex items-center gap-2 rounded-full px-2.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "size-2.5 rotate-45 rounded-[2px] transition-[background-color,box-shadow] duration-200",
                          active ? "bg-brass-light shadow-[0_0_10px_var(--glow)]" : i < current ? "bg-brass-dim" : "bg-parchment/20 group-hover:bg-brass-dim",
                        )}
                      />
                      <span className={cn("stat hidden text-xs tracking-[0.08em] whitespace-nowrap uppercase lg:inline", active ? "text-brass-light" : "text-ink-muted group-hover:text-parchment")}>
                        {c.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>
    </ScrollVelocityProvider>
  );
}
