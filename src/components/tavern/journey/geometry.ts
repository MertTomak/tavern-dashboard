/** Pure maths behind the Overview journey: resting chapters and the strip transition. */

/** Share of each chapter's scroll, on either side of centre, where it rests before the strips take it away. */
export const HOLD = 0.2;

/**
 * Order in which the strips leave: each strip's head start (0 … STRIP_SPREAD).
 * Uneven on purpose, so neighbouring strips slide at visibly different speeds.
 */
const STRIP_DELAYS = [0.1, 0, 0.17, 0.05, 0.13, 0.02] as const;
const STRIP_SPREAD = 0.2;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smooth = (x: number) => x * x * (3 - 2 * x);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Chapter position with a rest at every chapter: each whole number holds for 2 × HOLD of the scroll. */
export function held(pos: number, last: number): number {
  if (pos >= last) return last;
  if (pos <= 0) return 0;
  const k = Math.floor(pos);
  return k + smooth(clamp((pos - k - HOLD) / (1 - 2 * HOLD), 0, 1));
}

/**
 * clip-path for a chapter leaving in horizontal strips: `q` 0 = whole, 1 = gone.
 * Every strip's right edge retreats left at its own pace, so the panel breaks
 * into a staircase that reveals the next chapter. `strips` 1 gives a plain wipe.
 */
export function stripClip(q: number, strips: number = STRIP_DELAYS.length): string {
  if (q <= 0) return "none";
  const pts: string[] = ["0% 0%"];
  for (let i = 0; i < strips; i++) {
    const delay = strips === 1 ? 0 : (STRIP_DELAYS[i % STRIP_DELAYS.length] ?? 0);
    const spread = strips === 1 ? 0 : STRIP_SPREAD;
    const s = easeInOut(clamp((q - delay) / (1 - spread), 0, 1));
    const edge = `${((1 - s) * 100).toFixed(2)}%`;
    const top = ((i / strips) * 100).toFixed(2);
    const bottom = (((i + 1) / strips) * 100).toFixed(2);
    pts.push(`${edge} ${top}%`, `${edge} ${bottom}%`);
  }
  pts.push("0% 100%");
  return `polygon(${pts.join(", ")})`;
}
