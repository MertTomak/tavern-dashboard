"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { neighbour, slideDirection } from "@/components/tavern/nav-model";

const SWIPE_MIN_PX = 70;
const SWIPE_MAX_MS = 700;

/** True when the key belongs to something else: a field, a widget that uses arrows, or an open dialog. */
function keyIsTaken(e: KeyboardEvent): boolean {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return true;
  const el = e.target instanceof Element ? e.target : null;
  if (el?.closest("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role=slider], [role=listbox], [role=menu], [role=tablist], [data-own-arrows]")) return true;
  return document.querySelector("[role=dialog], [role=alertdialog]") !== null;
}

/** True when a touch started on something that scrolls sideways or handles its own drag. */
function touchIsTaken(target: EventTarget | null): boolean {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    if (el.hasAttribute("data-swipe-ignore")) return true;
    const ox = getComputedStyle(el).overflowX;
    if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 1) return true;
  }
  return false;
}

/**
 * Pages sit side by side in menu order. ← / → (and a sideways swipe on touch)
 * move to the neighbouring page with a directional slide; the URL updates.
 * Listens on the window and renders nothing, so it can sit in its own Suspense
 * boundary (the path is runtime data on pages with an id, like /games/[id]).
 */
export function PageNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  // Where we are heading: quick repeated presses step on from there, not from the page still sliding out.
  const heading = useRef<string | null>(null);
  useEffect(() => {
    heading.current = null;
  }, [pathname]);

  const go = useCallback(
    (step: 1 | -1) => {
      const from = heading.current ?? pathname;
      const href = neighbour(from, step);
      if (!href) return;
      heading.current = href;
      router.push(href, { transitionTypes: slideDirection(from, href) });
    },
    [pathname, router],
  );

  useEffect(() => {
    let touch: { x: number; y: number; t: number } | null = null;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== "ArrowRight" && e.key !== "ArrowLeft") || keyIsTaken(e)) return;
      e.preventDefault();
      go(e.key === "ArrowRight" ? 1 : -1);
    };
    const onTouchStart = (e: TouchEvent) => {
      const p = e.touches[0];
      touch = e.touches.length === 1 && p && !touchIsTaken(e.target) ? { x: p.clientX, y: p.clientY, t: e.timeStamp } : null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const start = touch;
      const p = e.changedTouches[0];
      touch = null;
      if (!start || !p) return;
      const dx = p.clientX - start.x;
      const dy = p.clientY - start.y;
      if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.6 || e.timeStamp - start.t > SWIPE_MAX_MS) return;
      // A swipe that began inside an open dialog or sheet stays there.
      if (document.querySelector("[role=dialog], [role=alertdialog]")) return;
      go(dx < 0 ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [go]);

  return null;
}
