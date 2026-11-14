/**
 * Where the two tracker panels sit, as pure maths (the Mac app applies it to
 * real windows, the demo page and the tests to made-up screens).
 * - "deck" (my deck): right edge of the game, almost full height.
 * - "opponent": top-left, below the opponent's name, a short wide strip that
 *   ends above Hearthstone's play history and left of the opponent's hand.
 * A place the user dragged a panel to is remembered relative to the game
 * window's corner, so it follows the game between windowed and full screen.
 */
export type Rect = { x: number; y: number; width: number; height: number };
export type PanelId = "deck" | "opponent";
export const PANEL_IDS = ["deck", "opponent"] as const;

export const DECK_SIZES = ["S", "M", "L"] as const;
export type DeckSize = (typeof DECK_SIZES)[number];

/** Panel widths the user can resize between (the panel itself, without the preview gutter). */
export const PANEL_LIMITS: Record<PanelId, { minWidth: number; maxWidth: number; minHeight: number }> = {
  deck: { minWidth: 190, maxWidth: 380, minHeight: 280 },
  opponent: { minWidth: 200, maxWidth: 560, minHeight: 140 },
};

/** Height of a windowed Hearthstone's title bar; the game picture starts below it. */
export const TITLE_BAR = 28;
/** Height of the opponent panel in its usual shape: one row of card backs (a hand of up to six) and two turns of plays. A bigger hand adds a second row (about 25 px). */
export const OPPONENT_STRIP_HEIGHT = 104;
const EDGE = 8;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The game picture inside Hearthstone's window: below the title bar when there is one. */
export function gamePicture(area: Rect, titleBar: number): Rect {
  return { x: area.x, y: area.y + titleBar, width: area.width, height: area.height - titleBar };
}

/**
 * Parts of Hearthstone's screen the panels should stay clear of, estimated from
 * the game's fixed layout: the board is a centred 4:3 picture, the play history
 * runs down its left edge, the opponent's hand hangs from the top centre and the
 * opponent's name is in the top-left corner.
 */
export function gameZones(picture: Rect): { board: Rect; history: Rect; opponentHand: Rect; opponentName: Rect } {
  const bw = Math.min(picture.width, (picture.height * 4) / 3);
  const board = { x: picture.x + (picture.width - bw) / 2, y: picture.y, width: bw, height: picture.height };
  return {
    board,
    history: { x: board.x + bw * 0.03, y: picture.y + picture.height * 0.175, width: bw * 0.065, height: picture.height * 0.6 },
    opponentHand: { x: board.x + bw * 0.34, y: picture.y, width: bw * 0.32, height: picture.height * 0.13 },
    opponentName: { x: picture.x, y: picture.y, width: Math.min(240, picture.width * 0.2), height: Math.max(26, picture.height * 0.032) },
  };
}

/** Where a panel goes when the user has not moved it. `area` is Hearthstone's window (or the screen). */
export function defaultPlace(panel: PanelId, area: Rect, titleBar = 0): Rect {
  const picture = gamePicture(area, titleBar);
  const { board, history, opponentHand, opponentName } = gameZones(picture);
  if (panel === "deck") {
    // As wide as the art beside the board allows, plus a little of the board's edge.
    const margin = picture.x + picture.width - (board.x + board.width);
    const width = clamp(Math.round(margin + 120), 230, 270);
    const height = Math.max(PANEL_LIMITS.deck.minHeight, Math.round(picture.height * 0.9));
    return { x: Math.round(picture.x + picture.width - width - EDGE), y: Math.round(picture.y + (picture.height - height) / 2), width, height };
  }
  const y = Math.round(opponentName.y + opponentName.height + 4);
  // The window reaches down so older turns can be opened; the panel itself stays a short strip.
  const height = Math.max(PANEL_LIMITS.opponent.minHeight, Math.round(picture.y + picture.height - y - EDGE));
  if (y + OPPONENT_STRIP_HEIGHT <= history.y) {
    // Room above the play history: a wide strip from the left edge to the opponent's hand.
    const width = clamp(Math.round(opponentHand.x - picture.x - 2 * EDGE), 280, 520);
    return { x: Math.round(picture.x + EDGE), y, width, height };
  }
  // A small game window: the history starts too high, so sit between it and the opponent's hand.
  const x = Math.round(history.x + history.width + EDGE);
  const width = clamp(Math.round(opponentHand.x - x - EDGE), PANEL_LIMITS.opponent.minWidth, 440);
  return { x, y, width, height };
}

/** A panel's place relative to the game window: `dx` from its own edge (deck: right, opponent: left), `dy` from the top. */
export type SavedPlace = { dx: number; dy: number; width: number; height: number; areaHeight: number };

export function toSaved(panel: PanelId, rect: Rect, area: Rect): SavedPlace {
  const dx = panel === "deck" ? area.x + area.width - (rect.x + rect.width) : rect.x - area.x;
  return { dx, dy: rect.y - area.y, width: rect.width, height: rect.height, areaHeight: area.height };
}

/** The remembered place on the current game window; heights follow the window's height. */
export function fromSaved(panel: PanelId, saved: SavedPlace, area: Rect): Rect {
  const scale = saved.areaHeight > 0 ? area.height / saved.areaHeight : 1;
  const limits = PANEL_LIMITS[panel];
  const width = clamp(saved.width, limits.minWidth, limits.maxWidth);
  const height = Math.max(limits.minHeight, Math.round(saved.height * scale));
  const x = panel === "deck" ? area.x + area.width - saved.dx - width : area.x + saved.dx;
  return { x: Math.round(x), y: Math.round(area.y + saved.dy * scale), width, height };
}

export function placePanel(panel: PanelId, area: Rect, titleBar: number, saved: SavedPlace | undefined): Rect {
  return saved ? fromSaved(panel, saved, area) : defaultPlace(panel, area, titleBar);
}

export const intersects = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Height a deck row gets: the list's height shared between the rows, within the size setting's limits. */
export const ROW_LIMITS: Record<DeckSize, { min: number; max: number }> = {
  S: { min: 20, max: 30 },
  M: { min: 22, max: 38 },
  L: { min: 24, max: 48 },
};
export const ROW_GAP = 2;

export function fitRowHeight(listHeight: number, rows: number, size: DeckSize): number {
  const { min, max } = ROW_LIMITS[size];
  if (rows <= 0 || listHeight <= 0) return max;
  return clamp(Math.floor((listHeight - ROW_GAP * (rows - 1)) / rows), min, max);
}
