"use client";

import { ArtImage } from "@/components/cards/CardArt";
import { CardPreview } from "@/components/cards/CardPreview";
import { ART_KINDS, artSrc } from "@/lib/cards/art";
import { cn } from "@/lib/utils";

/** Mana gem: the cost on a brass-rimmed blue-black diamond, like the game's cost crystal. */
export function ManaGem({ cost, className }: { cost: number | null; className?: string }) {
  return (
    <span aria-hidden className={cn("relative grid size-6 shrink-0 place-items-center", className)}>
      <span className="absolute inset-[3px] rotate-45 rounded-[3px] border border-brass-light/70 bg-[radial-gradient(circle_at_35%_30%,var(--mana-light),var(--mana-deep))] shadow-[0_1px_2px_rgb(0_0_0/0.6)]" />
      <span className="stat relative text-[13px] leading-none font-bold text-parchment [text-shadow:0_1px_1px_black]">{cost ?? "?"}</span>
    </span>
  );
}

type RowProps = {
  cardId: string;
  name: string;
  cost: number | null;
  /** Right-hand badge (×2, ×1, T3 …). */
  badge?: React.ReactNode;
  /** Spoken description of the badge for screen readers. */
  badgeLabel?: string;
  dimmed?: boolean;
  legendary?: boolean;
};

/**
 * One compact card row: mana gem, the card's tile art fading in from the right,
 * name and a badge. Hover shows the full card in the clear space left of the panel.
 */
export function TrackerCardRow({ cardId, name, cost, badge, badgeLabel, dimmed, legendary }: RowProps) {
  const { width, height } = ART_KINDS.tile;
  return (
    <CardPreview cardId={cardId} name={name}>
      <li
        tabIndex={0}
        aria-label={badgeLabel ? `${name}, ${badgeLabel}` : name}
        className={cn(
          "relative flex h-7 items-center gap-1 overflow-hidden rounded-xs border border-brass/20 bg-oak-deep pr-1 pl-0.5 outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-ring",
          dimmed && "opacity-35",
          legendary && "border-brass/45",
        )}
      >
        <ArtImage
          src={artSrc("tile", cardId)}
          alt=""
          width={width}
          height={height}
          className="absolute inset-y-0 right-0 h-full w-auto bg-transparent [mask-image:linear-gradient(to_right,transparent_5%,black_65%)]"
          fallback={<span />}
        />
        <span aria-hidden className="absolute inset-0 bg-linear-to-r from-oak-deep via-oak-deep/80 to-oak-deep/10" />
        <ManaGem cost={cost} />
        <span className="relative min-w-0 flex-1 truncate text-[12.5px] leading-none font-medium text-parchment [text-shadow:0_1px_2px_black]">{name}</span>
        {badge !== undefined && (
          <span aria-hidden className="stat relative flex h-5 min-w-5 items-center justify-center rounded-xs bg-oak-deep/90 px-1 text-[13px] font-bold text-brass-light">
            {badge}
          </span>
        )}
      </li>
    </CardPreview>
  );
}
