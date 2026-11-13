import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { patchQuery } from "@/lib/games-list";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

/** Previous / next page links that keep every other filter in the URL. */
export function Pager({ query, page, pages }: { query: string; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const qs = patchQuery(query, { page: String(p) });
    return qs ? `/games?${qs}` : "/games";
  };
  const link = (p: number, disabled: boolean, label: string, children: React.ReactNode) =>
    disabled ? (
      <span aria-disabled className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "pointer-events-none opacity-40")}>
        {children}
      </span>
    ) : (
      <Link href={href(p)} scroll={false} aria-label={label} className={buttonVariants({ variant: "outline", size: "icon-lg" })}>
        {children}
      </Link>
    );
  return (
    <nav aria-label={t.games.pagination} className="mt-4 flex items-center justify-end gap-3">
      {link(page - 1, page <= 1, t.games.prev, <ChevronLeft aria-hidden />)}
      <span className="stat text-sm text-ink-muted">{t.games.page(page, pages)}</span>
      {link(page + 1, page >= pages, t.games.next, <ChevronRight aria-hidden />)}
    </nav>
  );
}
