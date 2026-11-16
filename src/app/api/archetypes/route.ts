import { NextResponse } from "next/server";
import { createArchetype } from "@/lib/db/queries/archetypes";
import { afterChange, readArchetype } from "@/lib/http/archetype-request";
import { t } from "@/i18n";

/** POST { name, playerClass, signatureCards, minMatches } saves an archetype and classifies past games again. */
export async function POST(req: Request) {
  const body = await readArchetype(req);
  if (!body.ok) return body.res;
  try {
    const r = createArchetype(body.data);
    afterChange(r.changed);
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ error: t.archetypes.errors.failed }, { status: 500 });
  }
}
