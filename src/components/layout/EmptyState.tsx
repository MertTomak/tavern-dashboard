import Link from "next/link";
import { Flame } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { QuickAddEmptyButton } from "@/components/quick-add/QuickAddButton";

export function EmptyState({ note }: { note?: string }) {
  return (
    <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-lg border border-dashed border-border bg-card/60 px-6 py-16 text-center">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 size-72 rounded-full bg-[radial-gradient(circle,var(--glow),transparent_70%)]"
      />
      <span className="relative flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary shadow-[0_0_24px_var(--glow)]">
        <Flame className="size-5" aria-hidden />
      </span>
      <div className="relative space-y-1">
        <h2 className="font-display text-2xl font-semibold">{t.empty.title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{note ?? t.empty.body}</p>
      </div>
      <div className="relative flex flex-wrap justify-center gap-2">
        <QuickAddEmptyButton className="glow-hover px-4" />
        <Link href="/import" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-4")}>
          {t.empty.importLog}
        </Link>
      </div>
    </div>
  );
}
