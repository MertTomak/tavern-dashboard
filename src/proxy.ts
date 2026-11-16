import { NextResponse, type NextRequest } from "next/server";
import { DEMO_READ_ONLY_ERROR, IS_DEMO } from "@/lib/demo/mode";

/**
 * Demo mode is read-only: every API request that could change something is
 * answered here, before any route runs. (The demo database is read-only as
 * well, so this is the friendly message, not the only guard.) Outside demo
 * mode it lets everything through.
 */
export function proxy(request: NextRequest) {
  if (IS_DEMO && request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.json({ error: DEMO_READ_ONLY_ERROR }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
