import { NextResponse } from "next/server";
import { setInGame } from "@/lib/live/game-state";
import { isTrustedRequest } from "@/lib/http/same-origin";
import { watcherLiveSchema } from "@/lib/validation/import";

/** POST { inGame } from the watcher when a game starts or ends; Full effects run as Light meanwhile. */
export async function POST(req: Request) {
  if (!isTrustedRequest(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const parsed = watcherLiveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  setInGame(parsed.data.inGame);
  return NextResponse.json({ ok: true });
}
