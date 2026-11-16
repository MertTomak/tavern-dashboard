import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { cardByDbf, playableClasses } from "@/lib/cards/catalog";
import { isTrustedRequest } from "@/lib/http/same-origin";
import { publish } from "@/lib/live/events";
import { archetypeSchema, type ArchetypeBody } from "@/lib/validation/archetypes";
import { t } from "@/i18n";

/** The parsed body, or a user-facing error: the class must be playable and every card known. */
export async function readArchetype(req: Request): Promise<{ ok: true; data: ArchetypeBody } | { ok: false; res: NextResponse }> {
  if (!isTrustedRequest(req)) return { ok: false, res: NextResponse.json({ error: "Not allowed." }, { status: 403 }) };
  const parsed = archetypeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return { ok: false, res: NextResponse.json({ error: t.archetypes.errors.invalid }, { status: 400 }) };
  const known = playableClasses().includes(parsed.data.playerClass) && parsed.data.signatureCards.every((id) => cardByDbf(id));
  if (!known) return { ok: false, res: NextResponse.json({ error: t.archetypes.errors.invalid }, { status: 422 }) };
  return { ok: true, data: parsed.data };
}

/** After a rule changed: pages refresh; open pages hear about it if games moved. */
export function afterChange(changed: number) {
  revalidatePath("/", "layout");
  if (changed) publish({ type: "games:changed", added: [] });
}
