"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FramePanel } from "@/components/tavern/FramePanel";
import { classLabel } from "@/lib/cards/class-colors";
import { t } from "@/i18n";
import { DeleteGameDialog } from "./DeleteGameDialog";
import { GameEditor } from "./GameEditor";
import type { DeckOption } from "@/lib/db/queries/decks";
import type { ListGame } from "./types";

/** Edit and Delete on a game's own page; the editor unfolds in a panel below the buttons. */
export function GameActions({ game, decks }: { game: ListGame; decks: DeckOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const matchup = t.gameDetail.vs(classLabel(game.playerClass), classLabel(game.opponentClass));
  return (
    <div className="grid gap-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="lg" aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
          <Pencil aria-hidden />
          {t.games.edit}
        </Button>
        <Button variant="destructive" size="lg" onClick={() => setDeleting(true)}>
          <Trash2 aria-hidden />
          {t.games.delete}
        </Button>
      </div>
      {editing && (
        <FramePanel title={t.games.editTitle(matchup)}>
          <GameEditor game={game} decks={decks} onDone={() => setEditing(false)} />
        </FramePanel>
      )}
      <DeleteGameDialog game={deleting ? game : null} onClose={() => setDeleting(false)} afterDelete={() => router.push("/games")} />
    </div>
  );
}
