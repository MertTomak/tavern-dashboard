import { NextResponse } from "next/server";
import { connection } from "next/server";
import { isTrustedRequest } from "@/lib/http/same-origin";
import { reportWatcher } from "@/lib/live/watcher-status";
import { watcherStatusSchema } from "@/lib/validation/import";
import { currentWatcherStatus } from "@/lib/watcher/status";

/** GET → the running log watcher (null if none) and the last game it saved. */
export async function GET() {
  await connection();
  return NextResponse.json(currentWatcherStatus());
}

/** POST from the log watcher every few seconds. */
export async function POST(req: Request) {
  if (!isTrustedRequest(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const parsed = watcherStatusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  reportWatcher(parsed.data);
  return NextResponse.json({ ok: true });
}
