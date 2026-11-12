/**
 * Card art from HearthstoneJSON only, keyed by card id (e.g. "EX1_001").
 * Images are downloaded once into data/art/ and served from /api/art, so they
 * keep working offline. Personal, non-commercial use.
 */

export const ART_ORIGIN = "https://art.hearthstonejson.com/v1";

export const ART_KINDS = {
  /** Deck list strip, 256×59. */
  tile: { width: 256, height: 59, ext: "webp", path: (id: string) => `tiles/${id}.webp` },
  /** Full card render for hover previews, 256×388. */
  render: { width: 256, height: 388, ext: "png", path: (id: string) => `render/latest/enUS/256x/${id}.png` },
  /** Square art crop for banners, backgrounds and hero portraits, 512×512. */
  art: { width: 512, height: 512, ext: "webp", path: (id: string) => `512x/${id}.webp` },
} as const;

export type ArtKind = keyof typeof ART_KINDS;

export const CARD_ID_PATTERN = /^[A-Za-z0-9_]{2,48}$/;
export const CLASS_PATTERN = /^[A-Z]{2,24}$/;

export function isArtKind(kind: string): kind is ArtKind {
  return Object.hasOwn(ART_KINDS, kind);
}

/** Local URL for a card image (served from the data/art cache). */
export function artSrc(kind: ArtKind, cardId: string): string {
  return `/api/art/${kind}/${encodeURIComponent(cardId)}`;
}

/** Local URL for a class portrait (the class's default hero art). */
export function portraitSrc(cls: string): string {
  return `/api/art/portrait/${encodeURIComponent(cls)}`;
}

export function upstreamArtUrl(kind: ArtKind, cardId: string): string {
  return `${ART_ORIGIN}/${ART_KINDS[kind].path(cardId)}`;
}
