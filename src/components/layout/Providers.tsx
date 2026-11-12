"use client";

import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { WinCelebration } from "@/components/motion/WinCelebration";
import { snap } from "@/components/motion/timing";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="dark" disableTransitionOnChange>
      {/* "user": follows the OS Reduce motion setting (no movement, fades only). */}
      <MotionConfig reducedMotion="user" transition={snap}>
        <TooltipProvider>
          {children}
          <Toaster />
          <WinCelebration />
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
