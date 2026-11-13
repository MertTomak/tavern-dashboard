import { z } from "zod";

export const DECK_NAME_MAX = 60;

export const deckPreviewSchema = z.object({ text: z.string().max(20_000) });

export const deckSaveSchema = z.object({
  text: z.string().max(20_000),
  name: z.string().trim().min(1).max(DECK_NAME_MAX),
  /** Save as a new version of this deck instead of a new deck. */
  versionOf: z.number().int().positive().nullable(),
});
