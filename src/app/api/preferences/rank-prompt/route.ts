import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { skipRankPrompt } from "@/lib/db/queries/preferences";
import { isTrustedRequest } from "@/lib/http/same-origin";

const bodySchema = z.object({ skip: z.string().regex(/^[0-9a-f-]{36}$/) });

/** POST { skip: gameId } hides the Overview's rank prompt for that game. */
export async function POST(req: Request) {
  if (!isTrustedRequest(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    skipRankPrompt(parsed.data.skip);
  } catch {
    return NextResponse.json({ error: "Could not save your choice." }, { status: 500 });
  }
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
