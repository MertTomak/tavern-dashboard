"use client";

import { ArtImage } from "@/components/cards/CardArt";
import { CardPreview } from "@/components/cards/CardPreview";
import { ART_KINDS, artSrc } from "@/lib/cards/art";
import { cn } from "@/lib/utils";

/**
 * Mana gem: the cost on a brass-rimmed blue-black diamond, like the game's cost
 * crystal. Its box and number size come from `className` (default 24 px / 13 px).
 */
export function ManaGem({ cost, className }: { cost: number | null; className?: string }) {
  return (
    <span aria-hidden className={cn("relative grid size-6 shrink-0 place-items-center text-[13px]", className)}>
      <span className="absolute inset-[12%] rotate-45 rounded-[3px] border border-brass-light/70 bg-[radial-gradient(circle_at_35%_30%,var(--mana-light),var(--mana-deep))] shadow-[0_1px_2px_rgb(0_0_0/0.6)]" />
      <span className="stat relative leading-none font-bold text-parchment [text-shadow:0_1px_1px_black]">{cost ?? "?"}</span>
    </span>
  );
}

type RowProps = {
  cardId: string;
  name: string;
  cost: number | null;
  /** Right-hand badge (×2, ×1 …). */
  badge?: React.ReactNode;
  /** Spoken description of the badge for screen readers. */
  badgeLabel?: string;
  dimmed?: boolean;
  legendary?: boolean;
};

/**
 * One row of my deck: mana gem, the card's tile art fading in from the right,
 * name and copies left. Its height is `--row-h` and its text follows the list's
 * font size, both set by the list so the rows fill the panel. Hover shows the
 * full card in the clear space left of the panel.
 */
export function DeckCardRow({ cardId, name, cost, badge, badgeLabel, dimmed, legendary }: RowProps) {
  const { width, height } = ART_KINDS.tile;
  return (
    <CardPreview cardId={cardId} name={name}>
      <li
        tabIndex={0}
        aria-label={badgeLabel ? `${name}, ${badgeLabel}` : name}
        className={cn(
          "relative flex h-(--row-h) shrink-0 items-center gap-[0.35em] overflow-hidden rounded-xs border border-brass/25 bg-oak-deep pr-[0.3em] pl-px outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-ring",
          dimmed && "opacity-35",
          legendary && "border-brass/55",
        )}
      >
        <ArtImage
          src={artSrc("tile", cardId)}
          alt=""
          width={width}
          height={height}
          className="absolute inset-y-0 right-0 h-full w-auto bg-transparent [mask-image:linear-gradient(to_right,transparent_5%,black_60%)]"
          fallback={<span />}
        />
        <span aria-hidden className="absolute inset-0 bg-linear-to-r from-oak-deep via-oak-deep/75 to-oak-deep/5" />
        <ManaGem cost={cost} className="size-[calc(var(--row-h)-4px)] text-[1.05em]" />
        <span className="relative min-w-0 flex-1 truncate leading-none font-medium text-parchment [text-shadow:0_1px_2px_black,0_0_6px_black]">{name}</span>
        {badge !== undefined && (
          <span aria-hidden className="stat relative flex h-[calc(var(--row-h)-8px)] min-w-[1.5em] items-center justify-center rounded-xs bg-oak-deep/90 px-[0.25em] text-[1.1em] leading-none font-bold text-brass-light">
            {badge}
          </span>
        )}
      </li>
    </CardPreview>
  );
}
