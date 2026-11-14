"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ART_KINDS, artSrc } from "@/lib/cards/art";
import { ArtFallback, ArtImage } from "./CardArt";

type Props = { cardId: string; name: string; children: React.ReactElement; /** Which side of the row the card opens on. */ side?: "left" | "right" | "bottom" };

/** Shows the full card render on hover or keyboard focus. The image loads only when opened. */
export function CardPreview({ cardId, name, children, side = "left" }: Props) {
  const { width, height } = ART_KINDS.render;
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side} className="border-0 bg-transparent p-0 shadow-none [&>[data-side]]:hidden">
        <ArtImage
          src={artSrc("render", cardId)}
          alt={name}
          width={width}
          height={height}
          className="w-[200px] bg-transparent drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
          imgClassName="object-contain"
          fallback={<ArtFallback />}
          priority
        />
      </TooltipContent>
    </Tooltip>
  );
}
