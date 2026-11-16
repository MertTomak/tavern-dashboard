import type { CardIndex } from "@/lib/cards/all-cards";
import { tokenizeClock } from "@/lib/parser/tokenizer";
import { TrackerLog, type TrackerGame } from "@/lib/tracker/game";
import { buildTrackerView, type TrackerDeck, type TrackerView } from "@/lib/tracker/view";
import { RECORDED_DECK } from "./recorded-deck";

/** What the tracker showed at `at` ms after the game was created. */
export type ReplayFrame = { at: number; view: TrackerView };
export type ReplayGame = { me: string | null; opponent: string | null; durationMs: number; frames: ReplayFrame[] };

const DAY_MS = 86_400_000;

/** The recorded deck as the list the tracker counts down (as if matched against a saved deck). */
export function recordedDeck(cards: CardIndex): TrackerDeck {
  return {
    name: RECORDED_DECK.name,
    source: "match",
    cards: RECORDED_DECK.cards.flatMap(([cardId, count]) => {
      const dbfId = cards.byId(cardId)?.dbfId;
      return dbfId ? [{ dbfId, count }] : [];
    }),
  };
}

/**
 * Plays a recorded Power.log through the deck tracker's own game state and
 * view (so the fair-play rules are exactly the app's), and keeps every view
 * that differs from the one before, timed by the log's clock. Games that never
 * finished in the log are left out.
 */
export function buildReplay(lines: readonly string[], cards: CardIndex, deck: TrackerDeck | null): ReplayGame[] {
  const log = new TrackerLog();
  const done: ReplayGame[] = [];
  type Bucket = { game: TrackerGame; start: number; frames: ReplayFrame[]; last: string };
  // In a holder: the helpers below change it, which TypeScript's narrowing of a plain `let` would not see.
  const state: { current: Bucket | null } = { current: null };
  let clock = 0;
  let previous: number | null = null;
  let dayOffset = 0;
  const finished = new Set<TrackerGame>();

  const snapshot = () => {
    if (!state.current) return;
    const view = buildTrackerView(state.current.game, deck, cards);
    const json = JSON.stringify(view);
    if (json === state.current.last) return;
    state.current.last = json;
    state.current.frames.push({ at: clock - state.current.start, view });
  };
  const close = () => {
    if (state.current) finished.add(state.current.game);
    if (state.current && state.current.frames.at(-1)?.view.status === "over") {
      const view = state.current.frames.at(-1)!.view;
      done.push({ me: view.me.cls, opponent: view.opponent.cls, durationMs: state.current.frames.at(-1)!.at, frames: state.current.frames });
    }
    state.current = null;
  };

  for (const line of lines) {
    const raw = tokenizeClock(line);
    if (raw !== null) {
      // Lines with one timestamp land together; the view is taken once they all have.
      if (previous !== null && raw < previous - DAY_MS / 2) dayOffset += DAY_MS;
      const next = raw + dayOffset;
      if (next !== clock) snapshot();
      clock = next;
      previous = raw;
    }
    const changed = log.feed(line);
    if (log.game && log.game !== state.current?.game && !finished.has(log.game)) {
      close();
      state.current = { game: log.game, start: clock, frames: [], last: "" };
    }
    if (changed && state.current?.game.complete) {
      snapshot();
      close();
    }
  }
  snapshot();
  close();
  return done;
}
