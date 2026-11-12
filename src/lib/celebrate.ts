/** Browser event fired after a win is saved; WinCelebration listens for it. */
export const WIN_SAVED_EVENT = "hs:win-saved";

/** Call from the client right after a game with result WIN has been saved. */
export function celebrateWin(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(WIN_SAVED_EVENT));
}
