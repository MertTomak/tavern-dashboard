"use client";

import { useState } from "react";
import { RotateCcw, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Scoreboard } from "@/components/dashboard/Scoreboard";
import { Ticker } from "@/components/dashboard/Ticker";
import type { RecentGameView, ScoreboardView } from "@/components/dashboard/overview-view";
import { celebrateWin } from "@/lib/celebrate";
import { classLabel } from "@/lib/cards/class-colors";
import { formatShortDateTime } from "@/lib/format";
import type { GameResult } from "@/lib/stats/winrate";
import { t } from "@/i18n";

const OPPONENTS = ["MAGE", "WARRIOR", "HUNTER", "PRIEST", "ROGUE", "SHAMAN", "DRUID", "PALADIN", "WARLOCK", "DEMONHUNTER", "DEATHKNIGHT"];
const START = Date.UTC(2026, 10, 12, 15, 0);

function fakeGame(i: number, result: GameResult): RecentGameView {
  const cls = OPPONENTS[i % OPPONENTS.length];
  return {
    id: `demo-${i}`,
    result,
    opponent: classLabel(cls),
    opponentClass: cls,
    when: formatShortDateTime(new Date(START + i * 9 * 60_000).toISOString()),
  };
}

const INITIAL: RecentGameView[] = Array.from({ length: 10 }, (_, i) =>
  fakeGame(i, i % 3 === 1 ? "LOSS" : "WIN"),
).reverse();

function toView(games: RecentGameView[], wins: number, losses: number): ScoreboardView {
  const [latest] = games;
  let streak = 0;
  for (const g of games) {
    if (g.result !== latest.result) break;
    streak++;
  }
  return {
    winRate: wins / (wins + losses),
    games: t.overview.games(String(wins + losses)),
    wins,
    losses,
    last7: wins / (wins + losses),
    last7n: t.overview.n(String(wins + losses)),
    delta: t.overview.noPrevWeek,
    deltaUp: true,
    streak: latest.result === "WIN" ? t.overview.streakWins(streak) : t.overview.streakLosses(streak),
    streakResult: latest.result,
    avgDurationSec: 432,
    form: [...games].reverse(),
  };
}

/** Exercises live-update highlight, number flips and the win celebration with made-up games. */
export function MotionPlayground() {
  const [games, setGames] = useState(INITIAL);
  const [score, setScore] = useState({ wins: 57, losses: 43 });

  function add(result: GameResult) {
    setGames((g) => [fakeGame(Number(g[0].id.split("-")[1]) + 1, result), ...g].slice(0, 10));
    setScore((s) => (result === "WIN" ? { ...s, wins: s.wins + 1 } : { ...s, losses: s.losses + 1 }));
    if (result === "WIN") requestAnimationFrame(() => celebrateWin());
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Button size="lg" className="glow-hover px-4" onClick={() => add("WIN")}>
          <Trophy aria-hidden />
          {t.designLab.addWin}
        </Button>
        <Button size="lg" variant="outline" className="px-4" onClick={() => add("LOSS")}>
          <X aria-hidden />
          {t.designLab.addLoss}
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="px-4"
          onClick={() => {
            setGames(INITIAL);
            setScore({ wins: 57, losses: 43 });
          }}
        >
          <RotateCcw aria-hidden />
          {t.designLab.reset}
        </Button>
      </div>
      <Scoreboard view={toView(games, score.wins, score.losses)} />
      <Ticker games={games} />
    </div>
  );
}
