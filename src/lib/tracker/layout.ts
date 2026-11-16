/**
 * Where the two tracker panels sit, as pure maths (the Mac app applies it to
 * real windows, the demo page and the tests to made-up screens).
 * - "deck" (my deck): right edge of the game, almost full height.
 * - "opponent": a column of the same width on the far left edge, between the
 *   opponent's name (top-left) and my name (bottom-left).
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
  opponent: { minWidth: 190, maxWidth: 380, minHeight: 280 },
};

/** Height of a windowed Hearthstone's title bar; the game picture starts below it. */
export const TITLE_BAR = 28;
const EDGE = 8;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The game picture inside Hearthstone's window: below the title bar when there is one. */
export function gamePicture(area: Rect, titleBar: number): Rect {
  return { x: area.x, y: area.y + titleBar, width: area.width, height: area.height - titleBar };
}

/**
 * Parts of Hearthstone's screen that matter for the panels, estimated from the
 * game's fixed layout: the board is a centred 4:3 picture, the play history
 * runs down its left edge, and the two names sit in the left corners (the
 * opponent's on top, mine at the bottom).
 */
export function gameZones(picture: Rect): { board: Rect; history: Rect; opponentName: Rect; myName: Rect } {
  const bw = Math.min(picture.width, (picture.height * 4) / 3);
  const board = { x: picture.x + (picture.width - bw) / 2, y: picture.y, width: bw, height: picture.height };
  const name = { width: Math.min(240, picture.width * 0.2), height: Math.max(26, picture.height * 0.032) };
  return {
    board,
    history: { x: board.x + bw * 0.03, y: picture.y + picture.height * 0.175, width: bw * 0.065, height: picture.height * 0.6 },
    opponentName: { x: picture.x, y: picture.y, ...name },
    myName: { x: picture.x, y: picture.y + picture.height - name.height, ...name },
  };
}

/** Width of my deck panel when the user has not resized it: the art beside the board plus a little of the board's edge. */
function deckWidth(picture: Rect): number {
  const { board } = gameZones(picture);
  const margin = picture.x + picture.width - (board.x + board.width);
  return clamp(Math.round(margin + 120), 230, 270);
}

/**
 * Where a panel goes when the user has not moved it. `area` is Hearthstone's
 * window (or the screen). The opponent column takes `width` (my deck panel's
 * current width) so the two match.
 */
export function defaultPlace(panel: PanelId, area: Rect, titleBar = 0, width?: number): Rect {
  const picture = gamePicture(area, titleBar);
  if (panel === "deck") {
    const w = deckWidth(picture);
    const height = Math.max(PANEL_LIMITS.deck.minHeight, Math.round(picture.height * 0.9));
    return { x: Math.round(picture.x + picture.width - w - EDGE), y: Math.round(picture.y + (picture.height - height) / 2), width: w, height };
  }
  const { opponentName, myName } = gameZones(picture);
  const limits = PANEL_LIMITS.opponent;
  const y = Math.round(opponentName.y + opponentName.height + 4);
  const height = Math.max(limits.minHeight, Math.round(myName.y - 4 - y));
  return { x: Math.round(picture.x + EDGE), y, width: clamp(Math.round(width ?? deckWidth(picture)), limits.minWidth, limits.maxWidth), height };
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

export function placePanel(panel: PanelId, area: Rect, titleBar: number, saved: SavedPlace | undefined, width?: number): Rect {
  return saved ? fromSaved(panel, saved, area) : defaultPlace(panel, area, titleBar, width);
}

export const intersects = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Height a card row gets: the list's height shared between the rows, within the size setting's limits. */
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
