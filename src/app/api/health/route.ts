import { NextResponse } from "next/server";

/** GET → 200 once the server answers; the Mac app waits for this before opening its window. */
export function GET() {
  return NextResponse.json({ ok: true });
}
