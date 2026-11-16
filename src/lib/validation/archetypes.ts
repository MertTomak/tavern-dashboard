import { z } from "zod";
import { CLASS_PATTERN } from "@/lib/cards/art";

export const ARCHETYPE_NAME_MAX = 40;
export const ARCHETYPE_CARDS_MAX = 40;

/** POST /api/archetypes and PATCH /api/archetypes/[id]: the whole rule. */
export const archetypeSchema = z
  .object({
    name: z.string().trim().min(1).max(ARCHETYPE_NAME_MAX),
    playerClass: z.string().regex(CLASS_PATTERN),
    signatureCards: z.array(z.number().int().positive()).min(1).max(ARCHETYPE_CARDS_MAX).transform((ids) => [...new Set(ids)]),
    minMatches: z.number().int().min(1).max(10),
  })
  .strict()
  .refine((a) => a.minMatches <= a.signatureCards.length, { path: ["minMatches"], message: "More matches than signature cards." });

export type ArchetypeBody = z.infer<typeof archetypeSchema>;

/** GET /api/cards/search?q=&cls= */
export const cardSearchSchema = z.object({ q: z.string().trim().min(2).max(40), cls: z.string().regex(CLASS_PATTERN) });
