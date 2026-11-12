import { NAV_ITEMS, type NavItem } from "@/components/layout/nav-items";
import { t } from "@/i18n";

/** Phase in which each not-yet-built page opens (docs/ROADMAP.md). Built pages are absent. */
export const OPENS_IN: Record<string, number> = {
  "/games": 1,
  "/decks": 1,
  "/import": 1,
  "/matchups": 2,
  "/sessions": 5,
  "/battlegrounds": 6,
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
