import fs from "node:fs";
import path from "node:path";
import { ART_DIR } from "@/lib/paths";
import { ART_KINDS, CARD_ID_PATTERN, upstreamArtUrl, type ArtKind } from "./art";


export type CachedArt = { body: Buffer; contentType: string };

const CONTENT_TYPE = { webp: "image/webp", png: "image/png" } as const;

function filePath(kind: ArtKind, cardId: string): string {
  return path.join(/* turbopackIgnore: true */ ART_DIR, kind, `${cardId}.${ART_KINDS[kind].ext}`);
}

/** A card with no art upstream is remembered so we don't ask again on every render. */
function missingMarker(kind: ArtKind, cardId: string): string {
  return path.join(/* turbopackIgnore: true */ ART_DIR, kind, `${cardId}.missing`);
}

/**
 * Returns the image from data/art, downloading it from HearthstoneJSON the
 * first time. Returns null if the card has no art or we are offline and it
 * was never cached (the UI then shows its fallback).
 */
export async function getArt(kind: ArtKind, cardId: string): Promise<CachedArt | null> {
  if (!CARD_ID_PATTERN.test(cardId)) return null;
  const file = filePath(kind, cardId);
  const contentType = CONTENT_TYPE[ART_KINDS[kind].ext];
  if (fs.existsSync(file)) return { body: fs.readFileSync(file), contentType };
  if (fs.existsSync(missingMarker(kind, cardId))) return null;

  let res: Response;
  try {
    res = await fetch(upstreamArtUrl(kind, cardId), { signal: AbortSignal.timeout(8000) });
  } catch {
    return null; // offline: try again next time
  }
  if (res.status === 404) {
    remember(missingMarker(kind, cardId), "");
    return null;
  }
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.startsWith("image/")) return null;
  const body = Buffer.from(await res.arrayBuffer());
  remember(file, body);
  return { body, contentType };
}

/** Caching is best effort: a read-only disk (a hosted demo) still serves the image. */
function remember(file: string, body: Buffer | string) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  } catch {
    // Not cached; it is downloaded again next time.
  }
}
