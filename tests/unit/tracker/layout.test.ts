import { describe, expect, it } from "vitest";
import {
  OPPONENT_STRIP_HEIGHT,
  PANEL_LIMITS,
  TITLE_BAR,
  defaultPlace,
  fitRowHeight,
  fromSaved,
  gamePicture,
  gameZones,
  intersects,
  placePanel,
  toSaved,
  type Rect,
} from "@/lib/tracker/layout";

const SCREENS: [string, Rect, number][] = [
  ["1440×900 full screen", { x: 0, y: 0, width: 1440, height: 900 }, 0],
  ["1512×982 full screen", { x: 0, y: 0, width: 1512, height: 982 }, 0],
  ["1440×900 windowed", { x: 115, y: 44, width: 1152, height: 720 + TITLE_BAR }, TITLE_BAR],
  ["1512×982 windowed", { x: 121, y: 44, width: 1210, height: 756 + TITLE_BAR }, TITLE_BAR],
  ["4:3 window", { x: 40, y: 60, width: 1024, height: 768 + TITLE_BAR }, TITLE_BAR],
  ["16:9 external screen", { x: 1512, y: 0, width: 1920, height: 1080 }, 0],
];

describe.each(SCREENS)("tracker panels on %s", (_name, area, titleBar) => {
  const picture = gamePicture(area, titleBar);
  const zones = gameZones(picture);
  const deck = defaultPlace("deck", area, titleBar);
  const opponent = defaultPlace("opponent", area, titleBar);
  const strip = { ...opponent, height: OPPONENT_STRIP_HEIGHT };
  const inside = (r: Rect) => r.x >= picture.x && r.y >= picture.y && r.x + r.width <= picture.x + picture.width && r.y + r.height <= picture.y + picture.height;

  it("puts my deck on the right edge at almost full height", () => {
    expect(inside(deck)).toBe(true);
    expect(picture.x + picture.width - (deck.x + deck.width)).toBeLessThanOrEqual(10);
    expect(deck.height).toBeGreaterThanOrEqual(picture.height * 0.88);
    expect(deck.width).toBeGreaterThanOrEqual(PANEL_LIMITS.deck.minWidth);
    expect(deck.width).toBeLessThanOrEqual(270);
  });

  it("puts the opponent strip top-left, below the name and clear of the history and the opponent's hand", () => {
    expect(inside(opponent)).toBe(true);
    expect(opponent.x + opponent.width).toBeLessThanOrEqual(zones.opponentHand.x);
    expect(opponent.y - picture.y).toBeLessThanOrEqual(picture.height * 0.06);
    expect(opponent.width).toBeGreaterThanOrEqual(PANEL_LIMITS.opponent.minWidth);
    expect(opponent.y).toBeGreaterThanOrEqual(zones.opponentName.y + zones.opponentName.height);
    expect(intersects(strip, zones.history)).toBe(false);
    expect(intersects(strip, zones.opponentHand)).toBe(false);
    expect(intersects(strip, deck)).toBe(false);
  });
});

describe("remembered places", () => {
  const full: Rect = { x: 0, y: 0, width: 1440, height: 900 };
  const windowed: Rect = { x: 115, y: 44, width: 1152, height: 748 };

  it("round-trips on the same game window", () => {
    for (const panel of ["deck", "opponent"] as const) {
      const rect = { x: 900, y: 120, width: 240, height: 600 };
      expect(fromSaved(panel, toSaved(panel, rect, full), full)).toEqual(rect);
    }
  });

  it("follows the game window: my deck keeps its distance from the right edge, the opponent from the left", () => {
    const deck = { x: 1440 - 20 - 230, y: 45, width: 230, height: 810 };
    const moved = fromSaved("deck", toSaved("deck", deck, full), windowed);
    expect(moved.x + moved.width).toBe(windowed.x + windowed.width - 20);
    expect(moved.height).toBe(Math.round((810 * 748) / 900));
    expect(moved.y + moved.height).toBeLessThanOrEqual(windowed.y + windowed.height);

    const opponent = { x: 30, y: 50, width: 400, height: 500 };
    const movedOpponent = fromSaved("opponent", toSaved("opponent", opponent, full), windowed);
    expect(movedOpponent.x).toBe(windowed.x + 30);
    expect(movedOpponent.width).toBe(400);
  });

  it("uses the default place until the user moves a panel", () => {
    expect(placePanel("deck", full, 0, undefined)).toEqual(defaultPlace("deck", full, 0));
  });
});

describe("deck rows share the panel height", () => {
  it("grows rows up to the size setting and shrinks them down to its minimum", () => {
    expect(fitRowHeight(740, 16, "M")).toBe(38);
    expect(fitRowHeight(740, 16, "L")).toBe(44);
    expect(fitRowHeight(740, 16, "S")).toBe(30);
    expect(fitRowHeight(740, 24, "M")).toBe(28);
    expect(fitRowHeight(300, 24, "M")).toBe(22);
    expect(fitRowHeight(0, 24, "M")).toBe(38);
  });
});
