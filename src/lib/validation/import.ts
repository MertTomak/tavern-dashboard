import { z } from "zod";
import { gameRecordSchema } from "@/lib/parser/record";

export const confirmImportSchema = z.object({ token: z.string().uuid() });

/** What the log watcher sends after a game: the finished games and how far it has read the file. */
export const watcherImportSchema = z.object({
  filePath: z.string().min(1).max(1024),
  byteOffset: z.number().int().min(0),
  records: z.array(gameRecordSchema).max(50),
});

export const watcherLiveSchema = z.object({ inGame: z.boolean() });
/** Heartbeat from whichever log watcher is running (the Mac app or npm run watch:logs). */
export const watcherStatusSchema = z.object({
  owner: z.string().max(80),
  logRoot: z.string().max(1024),
  file: z.string().max(1024).nullable(),
  running: z.boolean(),
});
