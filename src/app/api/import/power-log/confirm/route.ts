import { NextResponse } from "next/server";
import { takeImport } from "@/lib/import/pending";
import { saveAndAnnounce } from "@/lib/import/save";
import { isTrustedRequest } from "@/lib/http/same-origin";
import { confirmImportSchema } from "@/lib/validation/import";

/** POST { token } saves a previewed upload as one import batch (undoable). Already-saved games are skipped. */
export async function POST(req: Request) {
  if (!isTrustedRequest(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const parsed = confirmImportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const held = takeImport(parsed.data.token);
  if (!held) return NextResponse.json({ error: "This preview has expired. Drop the file again." }, { status: 410 });
  try {
    const result = saveAndAnnounce(held.records, { source: "POWER_LOG", batch: { fileName: held.fileName, errors: held.errors } });
    return NextResponse.json({ imported: result.imported, skipped: result.skipped, batchId: result.batchId });
  } catch {
    return NextResponse.json({ error: "Could not save the games." }, { status: 500 });
  }
}
