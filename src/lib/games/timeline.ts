/**
 * Turns a game's card events into a turn-by-turn breakdown. Pure.
 * Turn numbers are each player's own turns (1, 2, 3 …); 0 is the mulligan.
 */

export type TimelineEvent = {
  side: "FRIENDLY" | "OPPOSING";
  dbfId: number;
  event: "MULLIGAN_KEPT" | "MULLIGAN_REPLACED" | "DRAWN" | "PLAYED" | "REVEALED";
  turn: number | null;
};

export type TimelineTurn = {
  turn: number;
  you: { drew: number[]; played: number[] };
  /** Revealed lists only cards that were not also played that turn (the log reveals every card the opponent plays). */
  opponent: { played: number[]; revealed: number[] };
};

export type Timeline = { mulligan: { kept: number[]; replaced: number[] }; turns: TimelineTurn[] };

export function buildTimeline(events: readonly TimelineEvent[]): Timeline {
  const mulligan = { kept: [] as number[], replaced: [] as number[] };
  const byTurn = new Map<number, TimelineTurn>();
  const turnOf = (n: number) => {
    let t = byTurn.get(n);
    if (!t) byTurn.set(n, (t = { turn: n, you: { drew: [], played: [] }, opponent: { played: [], revealed: [] } }));
    return t;
  };

  for (const e of events) {
    if (e.event === "MULLIGAN_KEPT") mulligan.kept.push(e.dbfId);
    else if (e.event === "MULLIGAN_REPLACED") mulligan.replaced.push(e.dbfId);
    else if (e.turn !== null && e.turn > 0) {
      const t = turnOf(e.turn);
      if (e.side === "FRIENDLY" && e.event === "DRAWN") t.you.drew.push(e.dbfId);
      else if (e.side === "FRIENDLY" && e.event === "PLAYED") t.you.played.push(e.dbfId);
      else if (e.side === "OPPOSING" && e.event === "PLAYED") t.opponent.played.push(e.dbfId);
      else if (e.side === "OPPOSING" && e.event === "REVEALED") t.opponent.revealed.push(e.dbfId);
    }
  }

  for (const t of byTurn.values()) {
    const left = [...t.opponent.played];
    t.opponent.revealed = t.opponent.revealed.filter((id) => {
      const i = left.indexOf(id);
      if (i < 0) return true;
      left.splice(i, 1);
      return false;
    });
  }

  return { mulligan, turns: [...byTurn.values()].sort((a, b) => a.turn - b.turn) };
}
