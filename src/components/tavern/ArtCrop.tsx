"use client";

import { ArtImage, ArtFallback } from "@/components/cards/CardArt";
import { artSrc } from "@/lib/cards/art";
import { cn } from "@/lib/utils";

type Props = {
  cardId: string;
  alt?: string;
  className?: string;
  /** Where the subject sits. Card art faces are usually in the upper third. */
  focus?: "face" | "center";
  /** Extra zoom on top of the letterbox crop. */
  zoom?: number;
  priority?: boolean;
  imgClassName?: string;
};

/**
 * Card art (512×512, often letterboxed) cropped to fill any box. The 1.32×
 * base zoom removes the transparent side margins so every crop looks the same.
 */
export function ArtCrop({ cardId, alt = "", className, focus = "center", zoom = 1, priority, imgClassName }: Props) {
  return (
    <ArtImage
      src={artSrc("art", cardId)}
      alt={alt}
      width={512}
      height={512}
      priority={priority}
      className={cn("size-full bg-transparent", className)}
      imgClassName={cn("[object-position:var(--focus)] [transform-origin:var(--focus)] [transform:scale(var(--zoom))]", imgClassName)}
      fallback={<ArtFallback />}
      style={{ ["--zoom" as string]: String(1.32 * zoom), ["--focus" as string]: focus === "face" ? "50% 26%" : "50% 45%" }}
    />
  );
}
