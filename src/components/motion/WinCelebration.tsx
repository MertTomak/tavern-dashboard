"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { WIN_SAVED_EVENT } from "@/lib/celebrate";
import { EASE_SNAP } from "./timing";

type Burst = { id: number; x: number; y: number };

const SPARKS = 10;
const ANCHOR = "[data-celebrate-anchor]";

/**
 * A small brass flare when a win is saved: one glow pulse on the win-rate
 * figure plus a few sparks. ~700 ms, transforms and opacity only.
 * With reduced motion it is just the glow, without movement.
 */
export function WinCelebration() {
  const reduce = useReducedMotion();
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    function onWin() {
      const anchor = document.querySelector<HTMLElement>(ANCHOR);
      const rect = anchor?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 3;
      const id = Date.now();
      setBursts((b) => [...b, { id, x, y }]);
      anchor?.animate(
        [
          { filter: "drop-shadow(0 0 0 transparent)" },
          { filter: "drop-shadow(0 0 22px var(--primary))" },
          { filter: "drop-shadow(0 0 0 transparent)" },
        ],
        { duration: 700, easing: "ease-out" },
      );
      window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 900);
    }
    window.addEventListener(WIN_SAVED_EVENT, onWin);
    return () => window.removeEventListener(WIN_SAVED_EVENT, onWin);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50">
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.div key={b.id} className="absolute" style={{ left: b.x, top: b.y }} exit={{ opacity: 0 }}>
            <motion.span
              className="absolute size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--glow),transparent_70%)]"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 0], scale: 1.4 }}
              transition={{ duration: 0.7, ease: EASE_SNAP }}
            />
            {!reduce &&
              Array.from({ length: SPARKS }, (_, i) => {
                const angle = (i / SPARKS) * Math.PI * 2;
                const dist = 70 + (i % 3) * 18;
                return (
                  <motion.span
                    key={i}
                    className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 0.4 }}
                    transition={{ duration: 0.65, ease: EASE_SNAP }}
                  />
                );
              })}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
