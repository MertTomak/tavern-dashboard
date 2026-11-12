// Our own class palette (not Blizzard's). Any class not listed here, such as a
// future Monk, falls back to NEUTRAL_CLASS_COLOR so the app keeps working.

export const NEUTRAL_CLASS_COLOR = "#9A9AA6";

const CLASS_COLORS: Record<string, string> = {
  DEATHKNIGHT: "#6FB7D4",
  DEMONHUNTER: "#5FBF7A",
  DRUID: "#B08A4E",
  HUNTER: "#8DBB4B",
  MAGE: "#5C9DF0",
  PALADIN: "#E8C35A",
  PRIEST: "#D9DCE4",
  ROGUE: "#8E8E9E",
  SHAMAN: "#4E7FE0",
  WARLOCK: "#A57BE0",
  WARRIOR: "#D9604C",
};

export function classColor(cls: string): string {
  return CLASS_COLORS[cls] ?? NEUTRAL_CLASS_COLOR;
}

const SPECIAL_LABELS: Record<string, string> = {
  DEATHKNIGHT: "Death Knight",
  DEMONHUNTER: "Demon Hunter",
};

/** "DEMONHUNTER" -> "Demon Hunter", "MONK" -> "Monk". */
export function classLabel(cls: string): string {
  return SPECIAL_LABELS[cls] ?? cls.charAt(0) + cls.slice(1).toLowerCase();
}
