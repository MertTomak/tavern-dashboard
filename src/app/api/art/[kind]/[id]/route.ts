import { NextResponse } from "next/server";
import { CLASS_PATTERN, isArtKind, type ArtKind } from "@/lib/cards/art";
import { getArt } from "@/lib/cards/art-cache";
import { heroCardId } from "@/lib/cards/catalog";

const NOT_FOUND = () => new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });

/**
 * GET /api/art/{tile|render|art}/{CARD_ID}  → card image from the local cache
 * GET /api/art/portrait/{CLASS}              → the class's default hero art
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/art/[kind]/[id]">) {
  const { kind, id } = await ctx.params;

  let artKind: ArtKind;
  let cardId: string | null;
  if (kind === "portrait") {
    if (!CLASS_PATTERN.test(id)) return NOT_FOUND();
    artKind = "art";
    cardId = heroCardId(id);
  } else if (isArtKind(kind)) {
    artKind = kind;
    cardId = id;
  } else {
    return NOT_FOUND();
  }
  if (!cardId) return NOT_FOUND();

  const art = await getArt(artKind, cardId);
  if (!art) return NOT_FOUND();
  return new NextResponse(new Uint8Array(art.body), {
    headers: {
      "Content-Type": art.contentType,
      // Card art never changes for a given id; let the browser keep it.
      "Cache-Control": "public, max-age=2592000, immutable",
    },
  });
}
