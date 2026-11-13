import type { GameRow } from "@/lib/db/queries/games";

/** A game row with its labels formatted on the server (same text on server and client). */
export type ListGame = GameRow & { when: string; durationText: string; rankText: string | null };
