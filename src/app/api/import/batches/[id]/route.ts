import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { undoImportBatch } from "@/lib/db/queries/import";
import { publish } from "@/lib/live/events";
import { isTrustedRequest } from "@/lib/http/same-origin";

/** DELETE undoes an import: its games are removed, everything else stays. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isTrustedRequest(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const removed = undoImportBatch(id);
    if (removed === null) return NextResponse.json({ error: "That import no longer exists." }, { status: 404 });
    revalidatePath("/", "layout");
    publish({ type: "games:changed", added: [] });
    return NextResponse.json({ removed });
  } catch {
    return NextResponse.json({ error: "Could not undo the import." }, { status: 500 });
  }
}
