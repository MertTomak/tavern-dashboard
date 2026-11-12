"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { motion } from "motion/react";
import { Monitor, Moon, Palette, Sun, Wind } from "lucide-react";
import { Panel } from "@/components/dashboard/Panel";
import { layoutSpring } from "@/components/motion/timing";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

const OPTIONS = [
  { value: "dark", icon: Moon },
  { value: "light", icon: Sun },
  { value: "system", icon: Monitor },
] as const;

const subscribe = () => () => {};

/** Theme picker as a segmented control; the brass pill slides to the chosen option. */
export function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser; render the selection after hydration.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const copy = t.settings.appearance;
  const current = hydrated ? (theme ?? "dark") : null;

  return (
    <Panel
      title={copy.title}
      hint={copy.description}
      action={<Palette className="size-4 text-primary" aria-hidden />}
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium" id="theme-label">
            {copy.theme}
          </span>
          <div role="radiogroup" aria-labelledby="theme-label" className="flex rounded-md border border-border bg-sunken p-1">
            {OPTIONS.map(({ value, icon: Icon }) => {
              const selected = current === value;
              return (
                <motion.button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(value)}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    "relative flex items-center gap-2 rounded-xs px-3 py-1.5 text-sm text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    selected && "text-primary-foreground",
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="theme-pill"
                      transition={layoutSpring}
                      className="absolute inset-0 rounded-xs bg-primary shadow-[0_0_14px_var(--glow)]"
                      aria-hidden
                    />
                  )}
                  <Icon className="relative size-4" aria-hidden />
                  <span className="relative">{copy.themes[value]}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-3 rounded-md border border-border bg-sunken/60 p-3 text-sm">
          <Wind className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p>
            <span className="font-medium">{copy.motion}. </span>
            <span className="text-muted-foreground">{copy.motionBody}</span>
          </p>
        </div>
      </div>
    </Panel>
  );
}
