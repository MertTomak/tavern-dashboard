import { NextResponse } from "next/server";
import { connection } from "next/server";
import { isTrustedRequest } from "@/lib/http/same-origin";
import { applyLogConfigFix, logConfigStatus } from "@/lib/logs/log-config-file";

/** GET → what log.config needs (nothing when it is right). */
export async function GET() {
  await connection();
  return NextResponse.json(logConfigStatus());
}

/** POST → apply the fix, sent only after the user approved the shown change in Settings. */
export async function POST(req: Request) {
  if (!isTrustedRequest(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  try {
    return NextResponse.json(applyLogConfigFix());
  } catch {
    return NextResponse.json({ error: "Could not change log.config." }, { status: 500 });
  }
}
