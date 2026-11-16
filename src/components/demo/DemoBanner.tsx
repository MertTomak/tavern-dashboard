import Link from "next/link";
import { Play } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

/** The strip at the top of every page in demo mode: what this is, and the way to the tracker replay. */
export function DemoBanner() {
  return (
    <div data-demo-banner className="flex h-9 items-center gap-3 border-b border-brass/25 bg-oak px-4 text-xs text-ink-muted md:px-8">
      <span className="stat rounded-xs border border-brass/60 bg-oak-deep px-1.5 py-0.5 text-[11px] font-semibold tracking-wider text-brass-light uppercase">{t.demo.badge}</span>
      <p className="min-w-0 flex-1 truncate">
        <span className="hidden sm:inline">{t.demo.banner}</span>
        <span className="sm:hidden">{t.demo.bannerShort}</span>
      </p>
      <Link href="/replay" className={cn(buttonVariants({ variant: "outline", size: "xs" }), "border-brass/50 text-brass-light")}>
        <Play aria-hidden />
        {t.demo.replay}
      </Link>
    </div>
  );
}
