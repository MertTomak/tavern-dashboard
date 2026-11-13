"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import { useLenis } from "lenis/react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { ArtCrop } from "../ArtCrop";
import { ChapterProvider, useJourneyEnabled } from "./reveal";

export type Chapter = {
  id: string;
  label: string;
  /** Card art behind the chapter (dimmed, moves slower than the panel for depth). */
  art?: string | null;
  children: React.ReactNode;
};

/** A chapter counts as arrived a bit before it is centred, so its entrance is done by the time it is. */
const ARRIVE_EARLY = 0.45;
/** Vertical scroll per chapter, as a share of the viewport height. */
const SCROLL_PER_CHAPTER = 0.85;

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

function ChapterPanel({
  chapter,
  index,
  progress,
  count,
  journey,
  arrived,
}: {
  chapter: Chapter;
  index: number;
  progress: MotionValue<number>;
  count: number;
  journey: boolean;
  arrived: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  // 0 when centred, +1 one screen to the right, -1 one screen to the left.
  const offset = useTransform(progress, (p) => Math.max(-1, Math.min(1, index - p * (count - 1))));
  const artX = useTransform(offset, (o) => `${o * 28}%`);
  const value = useMemo(() => ({ revealed: journey ? arrived : inView, offset }), [journey, arrived, inView, offset]);

  return (
    <section
      ref={ref}
      id={`chapter-${chapter.id}`}
      aria-label={chapter.label}
      className="relative isolate overflow-hidden journey:h-full journey:w-[calc(100%/var(--n))] journey:shrink-0"
    >
      {chapter.art && (
        <motion.div
          aria-hidden
          className="absolute -inset-y-10 -inset-x-[18%] -z-10 [mask-image:linear-gradient(to_right,transparent_8%,black_32%,black_68%,transparent_92%)]"
          style={journey ? { x: artX } : undefined}
        >
          <ArtCrop cardId={chapter.art} className="scale-125 opacity-45 blur-[3px] brightness-[0.45] saturate-[0.85]" />
          <span className="absolute inset-0 bg-[radial-gradient(ellipse_70%_65%_at_50%_45%,#120d0a99,#120d0a_80%)]" />
        </motion.div>
      )}
      <ChapterProvider value={value}>{chapter.children}</ChapterProvider>
    </section>
  );
}

/**
 * The Overview as a sideways journey. Normal vertical scrolling drives a pinned
 * track of full-height chapters from left to right; art layers move slower than
 * the panels for depth. No snapping. Each chapter's entrance plays once, as it
 * arrives, and is finished before it is centred. A brass chapter rail jumps
 * between chapters. Phones and Reduce motion get a normal vertical page.
 */
export function OverviewJourney({ chapters }: { chapters: Chapter[] }) {
  const journey = useJourneyEnabled();
  const outer = useRef<HTMLDivElement>(null);
  const geo = useGeometry(outer);
  const lenis = useLenis();
  const n = chapters.length;

  const { scrollY } = useScroll();
  const progress = useTransform(scrollY, (y) => Math.max(0, Math.min(1, (y - geo.current.start) / geo.current.range)));
  const x = useTransform(progress, (p) => `${(-p * (n - 1) * 100) / n}%`);

  const [arrived, setArrived] = useState(0);
  const [current, setCurrent] = useState(0);
  useMotionValueEvent(progress, "change", (p) => {
    const at = p * (n - 1);
    setCurrent(Math.round(at));
    setArrived((a) => Math.max(a, Math.floor(at + ARRIVE_EARLY)));
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
    <div
      ref={outer}
      className="relative journey:h-[calc((var(--n)-1)*var(--per)*100dvh+100dvh)]"
      style={{ ["--n" as string]: n, ["--per" as string]: SCROLL_PER_CHAPTER }}
    >
      <div className="journey:sticky journey:top-(--chrome-h) journey:h-[calc(100dvh-var(--chrome-h))] journey:overflow-hidden">
        <motion.div className="flex flex-col gap-10 journey:h-full journey:w-[calc(var(--n)*100%)] journey:flex-row journey:gap-0" style={journey ? { x } : undefined}>
          {chapters.map((c, i) => (
            <ChapterPanel key={c.id} chapter={c} index={i} progress={progress} count={n} journey={journey} arrived={i <= arrived} />
          ))}
        </motion.div>

        <nav aria-label={t.journey.chapters} className="pointer-events-none absolute inset-x-0 bottom-4 hidden justify-center journey:flex">
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
  );
}
