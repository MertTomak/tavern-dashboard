import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { TIME_ZONE } from "@/i18n";
import { existingHashes } from "@/lib/db/queries/import";
import { holdImport } from "@/lib/import/pending";
import { trackable } from "@/lib/import/save";
import { isTrustedRequest } from "@/lib/http/same-origin";
import { parsePowerLogStream, scanLogClock } from "@/lib/parser/read-file";
import { sessionFromFolder, sessionFromLastWrite } from "@/lib/parser/time";

/** Uploads above this are refused (a long session's Power.log is tens of MB). */
const MAX_BYTES = 400 * 1024 * 1024;

const webToNode = (file: File) => Readable.fromWeb(file.stream() as import("node:stream/web").ReadableStream<Uint8Array>);

/**
 * POST multipart { file, folder?, lastModified } → the games found, which are
 * already saved, and a token to confirm with. Nothing is saved here.
 */
export async function POST(req: Request) {
  if (!isTrustedRequest(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a Power.log file." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That file is too large to import." }, { status: 413 });

  const folder = String(form?.get("folder") ?? "");
  const lastModified = Number(form?.get("lastModified")) || Date.now();

  try {
    // With the session folder name the date is exact; otherwise work it out from the file's last write.
    let start = sessionFromFolder(folder);
    if (!start) {
      const scan = await scanLogClock(webToNode(file));
      if (!scan) return NextResponse.json({ error: "This doesn't look like a Hearthstone Power.log." }, { status: 422 });
      start = sessionFromLastWrite(new Date(lastModified), scan, TIME_ZONE);
    }
    const parsed = await parsePowerLogStream(webToNode(file), { session: folder || `upload:${file.name}`, start, timeZone: TIME_ZONE });
    const { keep, dropped } = trackable(parsed.games);
    const saved = existingHashes(keep.map((g) => g.sourceHash));
    const errors = parsed.skipped.map((s) => s.reason);
    const token = holdImport(keep, folder ? `${folder}/${file.name}` : file.name, errors);

    return NextResponse.json({
      token,
      games: keep.map((g) => ({
        sourceHash: g.sourceHash,
        startedAt: g.startedAt,
        mode: g.mode,
        format: g.format,
        result: g.result,
        conceded: g.conceded,
        playerClass: g.playerClass,
        opponentClass: g.opponentClass,
        wentFirst: g.wentFirst,
        turns: g.turns,
        durationSec: g.durationSec,
        duplicate: saved.has(g.sourceHash),
      })),
      unreadable: parsed.skipped.length,
      battlegrounds: dropped,
    });
  } catch {
    return NextResponse.json({ error: "Could not read this file." }, { status: 422 });
  }
}
