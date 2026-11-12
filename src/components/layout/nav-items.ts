import {
  Swords,
  LayoutDashboard,
  Layers,
  Grid3x3,
  Timer,
  Trophy,
  Dices,
  Upload,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/i18n";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: t.nav.overview, icon: LayoutDashboard },
  { href: "/games", label: t.nav.games, icon: Swords },
  { href: "/decks", label: t.nav.decks, icon: Layers },
  { href: "/matchups", label: t.nav.matchups, icon: Grid3x3 },
  { href: "/sessions", label: t.nav.sessions, icon: Timer },
  { href: "/battlegrounds", label: t.nav.battlegrounds, icon: Trophy },
  { href: "/arena", label: t.nav.arena, icon: Dices },
  { href: "/import", label: t.nav.import, icon: Upload },
  { href: "/settings", label: t.nav.settings, icon: Settings },
];
