import { z } from "zod";
import { CARD_EVENTS, CARD_SIDES, GAME_FORMATS, GAME_MODES, GAME_RESULTS } from "@/lib/db/schema";

/** Power.log GameType → our mode. Anything unknown is OTHER (never an error). */
const MODES: Record<string, (typeof GAME_MODES)[number]> = {
  GT_RANKED: "RANKED",
  GT_CASUAL: "CASUAL",
  GT_ARENA: "ARENA",
  GT_UNDERGROUND_ARENA: "ARENA",
  GT_BATTLEGROUNDS: "BATTLEGROUNDS",
  GT_BATTLEGROUNDS_FRIENDLY: "BATTLEGROUNDS",
  GT_BATTLEGROUNDS_AI_VS_AI: "BATTLEGROUNDS",
  GT_BATTLEGROUNDS_PLAYER_VS_AI: "BATTLEGROUNDS",
  GT_BATTLEGROUNDS_DUO: "BATTLEGROUNDS_DUOS",
  GT_BATTLEGROUNDS_DUO_VS_AI: "BATTLEGROUNDS_DUOS",
  GT_BATTLEGROUNDS_DUO_FRIENDLY: "BATTLEGROUNDS_DUOS",
  GT_TAVERNBRAWL: "BRAWL",
  GT_FSG_BRAWL: "BRAWL",
  GT_FSG_BRAWL_VS_FRIEND: "BRAWL",
  GT_FSG_BRAWL_1P_VS_AI: "BRAWL",
  GT_FSG_BRAWL_2P_COOP: "BRAWL",
  GT_VS_FRIEND: "FRIENDLY",
};

/** Power.log FormatType → our format; FT_UNKNOWN and anything else is null. */
const FORMATS: Record<string, (typeof GAME_FORMATS)[number]> = {
  FT_STANDARD: "STANDARD",
  FT_WILD: "WILD",
  FT_TWIST: "TWIST",
  FT_CLASSIC: "CLASSIC",
};

export function toMode(gameType: string | null): (typeof GAME_MODES)[number] {
  return (gameType && MODES[gameType]) || "OTHER";
}

export function toFormat(formatType: string | null): (typeof GAME_FORMATS)[number] | null {
  return (formatType && FORMATS[formatType]) || null;
}

export const isBattlegrounds = (mode: (typeof GAME_MODES)[number]) => mode === "BATTLEGROUNDS" || mode === "BATTLEGROUNDS_DUOS";

export const cardEventSchema = z.object({
  side: z.enum(CARD_SIDES),
  dbfId: z.number().int().positive(),
  event: z.enum(CARD_EVENTS),
  /** The player's own turn (1, 2, 3 …); 0 for the mulligan. */
  turn: z.number().int().min(0),
});
export type CardEvent = z.infer<typeof cardEventSchema>;

/** One finished game read from Power.log. Times are UTC ISO-8601. No BattleTags are kept. */
export const gameRecordSchema = z.object({
  sourceHash: z.string().regex(/^[0-9a-f]{64}$/),
  /** The log's session folder (or file name for old single-file logs). */
  session: z.string().min(1),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  durationSec: z.number().int().min(0),
  mode: z.enum(GAME_MODES),
  format: z.enum(GAME_FORMATS).nullable(),
  /** Raw values from the log, kept for troubleshooting unknown modes. */
  gameType: z.string().nullable(),
  formatType: z.string().nullable(),
  result: z.enum(GAME_RESULTS),
  /** Who conceded, if anyone. */
  conceded: z.enum(CARD_SIDES).nullable(),
  playerClass: z.string().min(1),
  opponentClass: z.string().min(1),
  playerHeroCardId: z.string(),
  opponentHeroCardId: z.string(),
  /** True = I went first, false = I had The Coin, null = not in the log. */
  wentFirst: z.boolean().nullable(),
  /** Turns each player had (the game's turn counter rounded up to whole rounds). */
  turns: z.number().int().min(0),
  /** The game's own turn counter (both players' turns added up). */
  gameTurns: z.number().int().min(0),
  /** Battlegrounds only: final placement 1–8. */
  placement: z.number().int().min(1).max(8).nullable(),
  cardEvents: z.array(cardEventSchema),
});
export type GameRecord = z.infer<typeof gameRecordSchema>;
