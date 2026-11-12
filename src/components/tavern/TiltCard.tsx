"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Maximum tilt in degrees. */
  max?: number;
  lift?: number;
};

/**
 * Lifts and tilts toward the pointer like a card picked up from the hand.
 * Transforms only; disabled entirely with reduced motion.
 */
export function TiltCard({ children, className, max = 10, lift = 14 }: Props) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 260, damping: 24, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const glareX = useTransform(px, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(py, [0, 1], ["0%", "100%"]);
  const glare = useTransform(
    [glareX, glareY],
    ([x, y]) => `radial-gradient(circle at ${String(x)} ${String(y)}, rgba(255,255,255,0.5), transparent 55%)`,
  );

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={`group/tilt relative ${className ?? ""}`}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      whileHover={{ y: -lift, scale: 1.03 }}
      whileFocus={{ y: -lift, scale: 1.03 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 mix-blend-soft-light transition-opacity duration-200 group-hover/tilt:opacity-100"
        style={{ background: glare }}
      />
    </motion.div>
  );
}
