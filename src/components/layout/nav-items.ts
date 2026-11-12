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
import { tr } from "@/i18n/tr";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: tr.nav.overview, icon: LayoutDashboard },
  { href: "/games", label: tr.nav.games, icon: Swords },
  { href: "/decks", label: tr.nav.decks, icon: Layers },
  { href: "/matchups", label: tr.nav.matchups, icon: Grid3x3 },
  { href: "/sessions", label: tr.nav.sessions, icon: Timer },
  { href: "/battlegrounds", label: tr.nav.battlegrounds, icon: Trophy },
  { href: "/arena", label: tr.nav.arena, icon: Dices },
  { href: "/import", label: tr.nav.import, icon: Upload },
  { href: "/settings", label: tr.nav.settings, icon: Settings },
];
