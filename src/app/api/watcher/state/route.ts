import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getWatcherOffset } from "@/lib/db/queries/import";

/** GET ?file=<path> → how far the watcher has read that log (0 if never). */
export async function GET(req: Request) {
  await connection();
  const file = new URL(req.url).searchParams.get("file");
  if (!file || file.length > 1024) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  return NextResponse.json({ byteOffset: getWatcherOffset(file) });
}
