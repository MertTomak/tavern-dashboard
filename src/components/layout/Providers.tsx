"use client";

import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { ReactLenis } from "lenis/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { WinCelebration } from "@/components/motion/WinCelebration";
import { snap } from "@/components/motion/timing";

/** Popups from shadcn/Base UI scroll natively (their markup is CLI-owned, so no data-lenis-prevent there). */
const NATIVE_SCROLL = "[data-slot=select-content], [data-slot=dialog-content], [data-slot=alert-dialog-content], [data-slot=dropdown-menu-content], [data-slot=tooltip-content]";

const LENIS_OPTIONS = {
  // Reduce motion: Lenis turns smoothing off (instant, native-feeling scroll).
  respectReducedMotion: true,
  lerp: 0.1,
  anchors: true,
  prevent: (node: HTMLElement) => node.matches?.(NATIVE_SCROLL) ?? false,
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="dark" disableTransitionOnChange>
      {/* "user": follows the OS Reduce motion setting (no movement, fades only). */}
      <MotionConfig reducedMotion="user" transition={snap}>
        <ReactLenis root options={LENIS_OPTIONS} />
        <TooltipProvider>
          {children}
          <Toaster />
          <WinCelebration />
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
