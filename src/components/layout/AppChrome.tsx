"use client";

import { useEffect, useRef } from "react";

/**
 * The sticky top chrome (menu bar + filter bar). Publishes its height as
 * `--chrome-h` so full-height panels (the Overview journey) fit below it.
 * Named for view transitions, so it stays put while pages slide underneath.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => root.style.setProperty("--chrome-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="sticky top-0 z-40" style={{ viewTransitionName: "app-chrome" }}>
      {children}
    </div>
  );
}
