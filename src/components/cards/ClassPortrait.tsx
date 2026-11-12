import { portraitSrc } from "@/lib/cards/art";
import { classColor, classLabel } from "@/lib/cards/class-colors";
import { cn } from "@/lib/utils";
import { ArtImage, ClassFallback } from "./CardArt";

type Props = { cls: string; size?: number; className?: string };

/**
 * Round class portrait from the default hero's card art, zoomed onto the face
 * (hero faces sit in the upper middle of the 512×512 art). Ringed in the class colour.
 */
export function ClassPortrait({ cls, size = 28, className }: Props) {
  return (
    <span
      className={cn("inline-block shrink-0 rounded-full p-px", className)}
      style={{ width: size, height: size, background: classColor(cls) }}
    >
      <ArtImage
        src={portraitSrc(cls)}
        alt={classLabel(cls)}
        width={size - 2}
        height={size - 2}
        className="rounded-full"
        imgClassName="scale-[1.9] object-[50%_24%] [transform-origin:50%_28%]"
        fallback={<ClassFallback cls={cls} />}
      />
    </span>
  );
}
