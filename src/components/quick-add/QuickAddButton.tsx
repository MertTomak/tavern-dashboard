"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openQuickAdd } from "@/lib/quick-add";
import { t } from "@/i18n";

/** Desktop: at the right end of the filter bar, with its key. */
export function QuickAddBarButton() {
  return (
    <Button size="sm" className="glow-hover ml-auto hidden h-8 gap-1.5 rounded-full px-3 md:inline-flex" onClick={openQuickAdd} aria-label={t.quickAdd.buttonLabel} aria-haspopup="dialog">
      <Plus aria-hidden />
      {t.quickAdd.button}
      <kbd className="stat ml-1 rounded-xs bg-oak/30 px-1 text-xs">N</kbd>
    </Button>
  );
}

/** Phone: the raised brass coin in the middle of the bottom bar. */
export function QuickAddCoin() {
  return (
    <button
      type="button"
      onClick={openQuickAdd}
      aria-label={t.quickAdd.buttonLabel}
      aria-haspopup="dialog"
      className="-mt-5 flex flex-col items-center gap-1 text-[11px] outline-none focus-visible:[&>span]:ring-2 focus-visible:[&>span]:ring-ring"
    >
      <span
        className="flex size-14 items-center justify-center rounded-full shadow-[0_0_0_3px_#1c1410,0_0_22px_var(--glow)] transition-transform duration-150 active:scale-95"
        style={{ background: "radial-gradient(circle at 35% 30%, #ffe7a8, #e0a84a 48%, #7a4f19 100%)" }}
      >
        <Plus className="size-6 text-oak" strokeWidth={2.75} aria-hidden />
      </span>
      <span className="text-brass-light">{t.quickAdd.button}</span>
    </button>
  );
}

/** The empty state's main call to action. */
export function QuickAddEmptyButton({ className }: { className?: string }) {
  return (
    <Button size="lg" className={className} onClick={openQuickAdd} aria-haspopup="dialog">
      {t.empty.addGame}
    </Button>
  );
}
