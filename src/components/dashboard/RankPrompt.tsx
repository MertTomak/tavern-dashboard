"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { RankPicker, type RankValue } from "@/components/games/RankPicker";
import { Button } from "@/components/ui/button";
import { snap } from "@/components/motion/timing";
import { classLabel } from "@/lib/cards/class-colors";
import { rankLabel } from "@/lib/stats/rank";
import { t } from "@/i18n";

type Props = {
  gameId: string;
  result: "WIN" | "LOSS" | "TIE";
  opponentClass: string;
  when: string;
  lastRank: RankValue | null;
};

/**
 * After a ranked game the log can't tell us the rank, so the Overview asks:
 * a small brass card in the corner. The league of the last entered rank is
 * open already, so most of the time one click on the new rank saves it.
 */
export function RankPrompt({ gameId, result, opponentClass, when, lastRank }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  if (gone) return null;

  async function save(v: RankValue) {
    if (v.rankAfter === null) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rankAfter: v.rankAfter, legendRank: v.legendRank }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.rank.saved(rankLabel(v.rankAfter, v.legendRank)));
      setGone(true);
      router.refresh();
    } catch {
      toast.error(t.rank.failed);
      setBusy(false);
    }
  }

  async function skip() {
    setGone(true);
    await fetch("/api/preferences/rank-prompt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skip: gameId }) }).catch(() => null);
  }

  return (
    <motion.aside
      aria-labelledby="rank-prompt-title"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={snap}
      // Above the phone's coin bar; bottom right on wider screens, clear of the chapter rail.
      className="brass-frame fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 grid gap-3 rounded-lg p-4 shadow-panel [--frame-fill:#1a130ef7] md:inset-x-auto md:right-6 md:bottom-24 md:w-[440px]"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brass/20 text-brass-light">
          <Trophy className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="rank-prompt-title" className="font-medium text-parchment">
            {t.rank.promptTitle}
          </h2>
          <p className="stat text-sm text-ink-muted">{t.rank.promptGame(t.overview.result[result], classLabel(opponentClass), when)}</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={t.rank.skipLabel} onClick={skip} disabled={busy}>
          <X aria-hidden />
        </Button>
      </div>
      <RankPicker compact value={lastRank ? { rankAfter: lastRank.rankAfter, legendRank: lastRank.legendRank } : { rankAfter: null, legendRank: null }} onChange={save} disabled={busy} />
      <p className="hidden text-xs text-ink-muted md:block">{t.rank.promptHint}</p>
    </motion.aside>
  );
}
