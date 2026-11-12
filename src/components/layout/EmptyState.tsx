import Link from "next/link";
import { Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export function EmptyState({ note }: { note?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Sparkles className="size-5" aria-hidden />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t.empty.title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{note ?? t.empty.body}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/games" className={cn(buttonVariants())}>
          {t.empty.addGame}
        </Link>
        <Link href="/import" className={cn(buttonVariants({ variant: "outline" }))}>
          {t.empty.importLog}
        </Link>
      </div>
    </div>
  );
}
