"use client";

import { useState } from "react";
import { RotateCcw, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatNumber } from "@/components/motion/StatNumber";
import { LastGames } from "@/components/tavern/LastGames";
import type { GameCard } from "@/components/tavern/types";
import { celebrateWin } from "@/lib/celebrate";
import { classLabel } from "@/lib/cards/class-colors";
import { formatShortDateTime } from "@/lib/format";
import type { GameResult } from "@/lib/stats/winrate";
import { t } from "@/i18n";

const OPPONENTS = ["MAGE", "WARRIOR", "HUNTER", "PRIEST", "ROGUE", "SHAMAN", "DRUID", "PALADIN", "WARLOCK", "DEMONHUNTER", "DEATHKNIGHT"];
const START = Date.UTC(2026, 10, 12, 15, 0);

/** Made-up games only; the art ids come from the page so they match the real class art. */
function fakeGame(i: number, result: GameResult, art: Record<string, string>): GameCard {
  const cls = OPPONENTS[i % OPPONENTS.length];
  return {
    id: `demo-${i}`,
    result,
    myClass: "MAGE",
    myArt: art.MAGE ?? "",
    oppClass: cls,
    oppArt: art[cls] ?? "",
    oppLabel: classLabel(cls),
    when: formatShortDateTime(new Date(START + i * 9 * 60_000).toISOString()),
  };
}

/** Exercises the live-update highlight, the number flip and the win celebration. Nothing is saved. */
export function MotionPlayground({ art }: { art: Record<string, string> }) {
  const initial = Array.from({ length: 8 }, (_, i) => fakeGame(i, i % 3 === 1 ? "LOSS" : "WIN", art)).reverse();
  const [games, setGames] = useState(initial);
  const [score, setScore] = useState({ wins: 57, losses: 43 });

  function add(result: GameResult) {
    setGames((g) => [fakeGame(Number(g[0].id.split("-")[1]) + 1, result, art), ...g].slice(0, 8));
    setScore((s) => (result === "WIN" ? { ...s, wins: s.wins + 1 } : { ...s, losses: s.losses + 1 }));
    if (result === "WIN") requestAnimationFrame(() => celebrateWin());
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        <Button size="lg" className="px-4" onClick={() => add("WIN")}>
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
            setGames(initial);
            setScore({ wins: 57, losses: 43 });
          }}
        >
          <RotateCcw aria-hidden />
          {t.designLab.reset}
        </Button>
      </div>
      <p data-celebrate-anchor className="w-fit font-display text-7xl font-semibold text-brass-light">
        <StatNumber value={score.wins / (score.wins + score.losses)} kind="percent" className="[font-variant-numeric:lining-nums_tabular-nums]" />
      </p>
      <LastGames games={games} />
    </div>
  );
}
