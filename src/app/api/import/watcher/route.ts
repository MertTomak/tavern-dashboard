import { NextResponse } from "next/server";
import { setWatcherOffset } from "@/lib/db/queries/import";
import { saveAndAnnounce, trackable } from "@/lib/import/save";
import { setInGame } from "@/lib/live/game-state";
import { isTrustedRequest } from "@/lib/http/same-origin";
import { watcherImportSchema } from "@/lib/validation/import";

/**
 * POST from the log watcher after a game ends: saves the finished games and
 * remembers how far the file has been read, in that order (a crash between
 * the two only re-sends games, which the duplicate check skips).
 */
export async function POST(req: Request) {
  if (!isTrustedRequest(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const parsed = watcherImportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { filePath, byteOffset, records } = parsed.data;
  try {
    const result = saveAndAnnounce(trackable(records).keep, { source: "WATCHER" });
    setWatcherOffset(filePath, byteOffset);
    if (records.length) setInGame(false);
    return NextResponse.json({ imported: result.imported, skipped: result.skipped });
  } catch {
    return NextResponse.json({ error: "Could not save the games." }, { status: 500 });
  }
}
