import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { setClassArtChoice } from "@/lib/db/queries/preferences";
import { classArtOptions } from "@/lib/cards/catalog";
import { CLASS_PATTERN } from "@/lib/cards/art";

const bodySchema = z.object({
  cls: z.string().regex(CLASS_PATTERN),
  cardId: z.string().max(48).nullable(),
});

/** PUT { cls, cardId } sets the art for a class; cardId null restores the default. */
export async function PUT(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { cls, cardId } = parsed.data;
  if (cardId !== null && !classArtOptions(cls).some((o) => o.id === cardId)) {
    return NextResponse.json({ error: "That art is not available for this class." }, { status: 400 });
  }
  try {
    setClassArtChoice(cls, cardId);
  } catch {
    return NextResponse.json({ error: "Could not save your choice." }, { status: 500 });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
