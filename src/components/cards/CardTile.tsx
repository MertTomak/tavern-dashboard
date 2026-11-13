"use client";

import { Star } from "lucide-react";
import { ART_KINDS, artSrc } from "@/lib/cards/art";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { ArtImage } from "./CardArt";
import { CardPreview } from "./CardPreview";

export type TileCard = { id: string; name: string; cost: number | null; rarity: string | null };

type Props = {
  card: TileCard;
  /** Copies in a deck; shown when 2 or more. */
  count?: number;
  /** Faded, for a mulligan card that went back. */
  muted?: boolean;
  className?: string;
};

/**
 * A card as a deck-list strip: mana cost, name, and the card's tile art fading
 * in from the right. Hover or focus shows the full card. Legendaries carry a star.
 */
export function CardTile({ card, count, muted, className }: Props) {
  const { width, height } = ART_KINDS.tile;
  const legendary = card.rarity === "LEGENDARY";
  return (
    <CardPreview cardId={card.id} name={card.name}>
      <span
        tabIndex={0}
        className={cn(
          "relative flex h-9 items-center overflow-hidden rounded-xs border border-brass/25 bg-oak-deep outline-none focus-visible:ring-2 focus-visible:ring-ring",
          muted && "opacity-50",
          className,
        )}
      >
        <ArtImage
          src={artSrc("tile", card.id)}
          alt=""
          width={width}
          height={height}
          className="absolute inset-y-0 right-0 h-full w-auto bg-transparent [mask-image:linear-gradient(to_right,transparent,black_45%)]"
          fallback={<span />}
        />
        <span aria-hidden className="absolute inset-0 bg-linear-to-r from-oak-deep via-oak-deep/85 to-transparent" />
        <span className="stat relative flex h-full w-8 shrink-0 items-center justify-center border-r border-brass/25 bg-brass/15 text-base font-bold text-brass-light">
          {card.cost ?? "–"}
        </span>
        <span className={cn("relative min-w-0 flex-1 truncate px-2 text-[13px] font-medium text-parchment [text-shadow:0_1px_2px_black]", muted && "line-through decoration-parchment/60")}>
          {card.name}
        </span>
        {(legendary || (count ?? 1) > 1) && (
          <span className="stat relative mr-1.5 flex h-6 min-w-6 items-center justify-center rounded-xs bg-oak-deep/90 px-1 text-sm font-bold text-brass-light">
            {legendary ? <Star className="size-3.5 fill-current" aria-label={t.cards.legendary} /> : `×${count}`}
          </span>
        )}
      </span>
    </CardPreview>
  );
}
