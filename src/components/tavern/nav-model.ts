import { NAV_ITEMS, type NavItem } from "@/components/layout/nav-items";
import { t } from "@/i18n";

/** Phase in which each not-yet-built page opens (docs/ROADMAP.md). Built pages are absent. */
export const OPENS_IN: Record<string, number> = {
  "/matchups": 2,
  "/sessions": 5,
  "/arena": 6,
};

/** The four destinations on the phone's bottom bar; the rest live under More. */
export const PRIMARY = ["/", "/games", "/decks", "/matchups"];

export type Destination = NavItem & { subtitle: string; locked: number | null; primary: boolean };

export function destinations(): Destination[] {
  return NAV_ITEMS.map((item) => {
    const locked = OPENS_IN[item.href] ?? null;
    const sub = t.navSub[item.href as keyof typeof t.navSub];
    return {
      ...item,
      subtitle: locked ? t.concepts.soon(locked) : (sub ?? ""),
      locked,
      primary: PRIMARY.includes(item.href),
    };
  });
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Pages sit side by side in menu order; this is a page's place in that row (-1 if unknown). */
export function pageIndex(pathname: string): number {
  const hrefs = NAV_ITEMS.map((d) => d.href);
  // Longest match first, so "/games/123" belongs to "/games", not "/".
  const match = [...hrefs].sort((a, b) => b.length - a.length).find((h) => isActive(pathname, h));
  return match ? hrefs.indexOf(match) : -1;
}

export type SlideDirection = "nav-forward" | "nav-back";

/** Transition type for a move between two pages: forward slides in from the right. */
export function slideDirection(fromPath: string, toHref: string): SlideDirection[] {
  const from = pageIndex(fromPath);
  const to = pageIndex(toHref);
  if (from < 0 || to < 0 || from === to) return [];
  return [to > from ? "nav-forward" : "nav-back"];
}

/** The page next to the current one, or null at either end of the row. */
export function neighbour(pathname: string, step: 1 | -1): string | null {
  const i = pageIndex(pathname);
  if (i < 0) return null;
  return NAV_ITEMS[i + step]?.href ?? null;
}
