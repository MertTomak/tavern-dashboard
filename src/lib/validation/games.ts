import { z } from "zod";
import { LEGEND_INDEX } from "@/lib/stats/rank";
import { CLASS_PATTERN } from "@/lib/cards/art";
import { GAME_FORMATS } from "@/lib/db/schema";

export const NOTES_MAX = 500;

/** PATCH /api/games/[id]: any of deck, rank and notes. Rank is the numeric index (0 = Bronze 10, 50 = Legend). */
export const gamePatchSchema = z
  .object({
    deckId: z.number().int().positive().nullable().optional(),
    rankAfter: z.number().int().min(0).max(LEGEND_INDEX).nullable().optional(),
    legendRank: z.number().int().min(1).max(1_000_000).nullable().optional(),
    notes: z
      .string()
      .max(NOTES_MAX)
      .transform((s) => s.trim() || null)
      .nullable()
      .optional(),
  })
  .strict()
  .refine((p) => Object.keys(p).length > 0, "Nothing to change.");

export type GamePatchInput = z.infer<typeof gamePatchSchema>;

/** Modes Quick add offers (Battlegrounds is not tracked). */
export const QUICK_ADD_MODES = ["RANKED", "CASUAL", "FRIENDLY", "BRAWL", "ARENA", "OTHER"] as const;

/** POST /api/games: a game added by hand, played now. */
export const gameCreateSchema = z
  .object({
    playerClass: z.string().regex(CLASS_PATTERN),
    opponentClass: z.string().regex(CLASS_PATTERN),
    result: z.enum(["WIN", "LOSS", "TIE"]),
    mode: z.enum(QUICK_ADD_MODES),
    format: z.enum(GAME_FORMATS).nullable(),
    deckId: z.number().int().positive().nullable(),
    wentFirst: z.boolean().nullable(),
  })
  .strict();

export type GameCreateInput = z.infer<typeof gameCreateSchema>;
