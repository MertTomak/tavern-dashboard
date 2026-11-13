import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { setEffectsLevel } from "@/lib/db/queries/preferences";
import { effectsLevelSchema } from "@/lib/effects";

const bodySchema = z.object({ level: effectsLevelSchema });

/** PUT { level } sets the Overview effects level (FULL, LIGHT or OFF). */
export async function PUT(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    setEffectsLevel(parsed.data.level);
  } catch {
    return NextResponse.json({ error: "Could not save your choice." }, { status: 500 });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
