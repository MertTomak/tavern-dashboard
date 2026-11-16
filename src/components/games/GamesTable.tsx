"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, ArrowUpDown, NotebookPen, Pencil, Trash2 } from "lucide-react";
import { ClassPortrait } from "@/components/cards/ClassPortrait";
import { ResultChip, RESULT_BG } from "@/components/dashboard/ResultMark";
import { useNewIds } from "@/components/motion/use-new-ids";
import { layoutSpring, snap } from "@/components/motion/timing";
import { Button } from "@/components/ui/button";
import { classLabel } from "@/lib/cards/class-colors";
import { nextSort, patchQuery, type GameSort, type SortDir } from "@/lib/games-list";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { DeleteGameDialog } from "./DeleteGameDialog";
import { GameEditor } from "./GameEditor";
import type { DeckOption } from "@/lib/db/queries/decks";
import type { ListGame } from "./types";

const c = t.games.columns;

/** Desktop column template: result · you · opponent · mode · start · turns · length · rank · date · actions. */
const GRID =
  "md:grid-cols-[3.25rem_minmax(0,1.7fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_3.5rem_3.25rem_4.5rem_minmax(0,1fr)_minmax(0,1fr)_4.75rem]";

function SortHeader({ column, label, sort, dir }: { column: GameSort; label: string; sort: GameSort; dir: SortDir }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const next = nextSort({ sort, dir }, column);
  const qs = patchQuery(params.toString(), { sort: next.sort, dir: next.dir });
  const active = sort === column;
  const Icon = !active ? ArrowUpDown : dir === "desc" ? ArrowDown : ArrowUp;
  return (
    <span role="columnheader" aria-sort={active ? (dir === "desc" ? "descending" : "ascending") : "none"}>
      <Link
        href={qs ? `${pathname}?${qs}` : pathname}
        scroll={false}
        replace
        aria-label={t.games.sortBy(label)}
        className={cn("inline-flex items-center gap-1 rounded-xs outline-none hover:text-parchment focus-visible:ring-2 focus-visible:ring-ring", active && "text-brass-light")}
      >
        {label}
        <Icon className="size-3" aria-hidden />
      </Link>
    </span>
  );
}

type Props = { games: ListGame[]; decks: DeckOption[]; sort: GameSort; dir: SortDir };

/**
 * Every game, one row each (two lines on phones). The row opens the game's
 * breakdown; Edit unfolds deck, rank and notes under it; Delete asks first.
 */
export function GamesTable({ games, decks, sort, dir }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ListGame | null>(null);
  const fresh = useNewIds(games.map((g) => g.id));

  return (
    <div role="table" aria-label={t.pages.games.title} className="text-sm">
      <div role="rowgroup">
        <div
          role="row"
          className={cn("stat hidden items-center gap-3 border-b border-brass/20 pb-2 text-xs tracking-[0.08em] text-ink-muted uppercase md:grid", GRID)}
        >
          <span role="columnheader">{c.result}</span>
          <span role="columnheader">{c.you}</span>
          <span role="columnheader">{c.opponent}</span>
          <span role="columnheader">{c.mode}</span>
          <span role="columnheader">{c.start}</span>
          <SortHeader column="turns" label={c.turns} sort={sort} dir={dir} />
          <SortHeader column="duration" label={c.duration} sort={sort} dir={dir} />
          <span role="columnheader">{c.rank}</span>
          <SortHeader column="date" label={c.date} sort={sort} dir={dir} />
          <span role="columnheader" className="sr-only">
            {t.games.edit}
          </span>
        </div>
      </div>
      <ol role="rowgroup">
        <AnimatePresence initial={false}>
          {games.map((g) => (
            <motion.li
              key={g.id}
              layout="position"
              transition={layoutSpring}
              exit={{ opacity: 0, transition: snap }}
              className="border-b border-brass/10"
            >
              <Row game={g} fresh={fresh.has(g.id)} editing={editing === g.id} onEdit={() => setEditing(editing === g.id ? null : g.id)} onDelete={() => setDeleting(g)} />
              <AnimatePresence initial={false}>
                {editing === g.id && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={snap}>
                    <GameEditor game={g} decks={decks.filter((d) => d.playerClass === g.playerClass)} onDone={() => setEditing(null)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      <DeleteGameDialog game={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function Row({ game: g, fresh, editing, onEdit, onDelete }: { game: ListGame; fresh: boolean; editing: boolean; onEdit: () => void; onDelete: () => void }) {
  const me = classLabel(g.playerClass);
  const opp = classLabel(g.opponentClass);
  const matchup = t.gameDetail.vs(me, opp);
  const start = g.wentFirst === null ? t.games.unknown : g.wentFirst ? t.games.first : t.games.coin;
  return (
    <div
      role="row"
      className={cn(
        "group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2.5 transition-colors duration-150 hover:bg-brass/[0.06] md:gap-y-0",
        GRID,
        editing && "bg-brass/[0.06]",
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-2 left-0 w-0.5 rounded-full opacity-70", RESULT_BG[g.result])} />
      {fresh && <motion.span aria-hidden className="pointer-events-none absolute inset-0 shadow-glow" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.4, ease: "easeOut" }} />}

      <span role="cell" className="row-span-2 pl-2 md:row-span-1">
        <ResultChip result={g.result} />
      </span>

      <span role="cell" className="flex min-w-0 items-center gap-2">
        <ClassPortrait cls={g.playerClass} size={28} />
        <span className="min-w-0">
          <Link
            href={`/games/${g.id}`}
            aria-label={t.games.open(matchup, g.when)}
            className="block truncate font-medium text-parchment outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-xs focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            <span className="md:hidden">{matchup}</span>
            <span className="hidden md:inline">{me}</span>
          </Link>
          <span className={cn("block truncate text-xs", g.deckName ? "text-brass-dim" : "text-ink-muted")}>{g.deckName ?? t.games.noDeck}</span>
        </span>
      </span>

      <span role="cell" className="hidden min-w-0 items-center gap-2 md:flex">
        <ClassPortrait cls={g.opponentClass} size={28} />
        <span className="min-w-0">
          <span className="block truncate text-parchment">{opp}</span>
          {g.opponentArchetype && <span className="block truncate text-xs text-brass-dim">{g.opponentArchetype}</span>}
        </span>
      </span>

      <span role="cell" className="col-start-2 truncate text-xs text-ink-muted md:col-start-auto md:text-sm">
        {t.filters.modes[g.mode]}
        <span className="md:hidden">
          {" · "}
          {start} · {t.games.columns.turns} {g.turns ?? t.games.unknown} · {g.durationText}
          {g.rankText ? ` · ${g.rankText}` : ""}
        </span>
      </span>
      <span role="cell" className="stat hidden text-ink-muted md:block">
        {start}
      </span>
      <span role="cell" className="stat hidden text-ink-muted md:block">
        {g.turns ?? t.games.unknown}
      </span>
      <span role="cell" className="stat hidden text-ink-muted md:block">
        {g.durationText}
      </span>
      <span role="cell" className={cn("stat hidden truncate md:block", g.rankText ? "text-parchment" : "text-ink-muted")}>
        {g.rankText ?? t.games.unknown}
      </span>
      <span role="cell" className="stat col-start-3 row-start-1 flex items-center justify-end gap-1.5 text-right text-ink-muted md:col-start-auto md:row-start-auto md:justify-start md:text-left">
        {g.notes && <NotebookPen className="size-3.5 shrink-0 text-brass-dim" aria-label={t.games.hasNotes} />}
        <span className="whitespace-nowrap">{g.when}</span>
      </span>
      <span role="cell" className="relative z-10 col-start-3 row-start-2 flex justify-end gap-0.5 md:col-start-auto md:row-start-auto">
        <Button variant="ghost" size="icon-sm" aria-label={t.games.editTitle(matchup)} aria-expanded={editing} onClick={onEdit}>
          <Pencil aria-hidden />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`${t.games.delete} ${matchup}`} onClick={onDelete} className="text-ink-muted hover:text-loss">
          <Trash2 aria-hidden />
        </Button>
      </span>
    </div>
  );
}
