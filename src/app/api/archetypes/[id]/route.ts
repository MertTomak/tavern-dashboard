import { NextResponse } from "next/server";
import { deleteArchetype, updateArchetype } from "@/lib/db/queries/archetypes";
import { isTrustedRequest } from "@/lib/http/same-origin";
import { afterChange, readArchetype } from "@/lib/http/archetype-request";
import { t } from "@/i18n";

async function idOf(ctx: { params: Promise<{ id: string }> }): Promise<number | null> {
  const id = Number((await ctx.params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** PATCH (the whole rule) changes an archetype and classifies past games again. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await idOf(ctx);
  if (id === null) return NextResponse.json({ error: t.archetypes.errors.invalid }, { status: 400 });
  const body = await readArchetype(req);
  if (!body.ok) return body.res;
  try {
    const r = updateArchetype(id, body.data);
    if (!r) return NextResponse.json({ error: t.archetypes.errors.notFound }, { status: 404 });
    afterChange(r.changed);
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ error: t.archetypes.errors.failed }, { status: 500 });
  }
}

/** DELETE removes an archetype; its games are classified again. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isTrustedRequest(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const id = await idOf(ctx);
  if (id === null) return NextResponse.json({ error: t.archetypes.errors.invalid }, { status: 400 });
  try {
    const r = deleteArchetype(id);
    if (!r) return NextResponse.json({ error: t.archetypes.errors.notFound }, { status: 404 });
    afterChange(r.changed);
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ error: t.archetypes.errors.failed }, { status: 500 });
  }
}
