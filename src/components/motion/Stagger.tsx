"use client";

import { motion, type Variants } from "motion/react";
import { DURATION, EASE_SNAP, STAGGER } from "./timing";

const group: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE_SNAP } },
};

type Props = { children: React.ReactNode; className?: string };

/** Panels enter one after another, quickly, on first paint. */
export function Stagger({ children, className }: Props) {
  return (
    <motion.div className={className} variants={group} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: Props) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
