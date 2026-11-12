"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { classColor, classLabel } from "@/lib/cards/class-colors";
import { cn } from "@/lib/utils";

type ImgProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  imgClassName?: string;
  /** Shown when the image is missing (no art upstream, or offline and never cached). */
  fallback: React.ReactNode;
  priority?: boolean;
};

/**
 * Fixed-size, lazy-loaded image with a designed fallback. The box always has
 * its final size, so loading or failing never shifts the layout.
 */
export function ArtImage({ src, alt, width, height, className, imgClassName, fallback, priority }: ImgProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;
  const img = useRef<HTMLImageElement>(null);

  // An image can fail before React hydrates and attaches onError; catch that case too.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth === 0) setFailedSrc(src);
  }, [src]);
  return (
    <span className={cn("relative block overflow-hidden bg-sunken", className)} style={{ aspectRatio: `${width} / ${height}` }}>
      {failed ? (
        fallback
      ) : (
        // A plain <img>: the files are already optimised and served from the local cache.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={img}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailedSrc(src)}
          className={cn("size-full object-cover", imgClassName)}
        />
      )}
    </span>
  );
}

/** Fallback for class art: the class colour and initial, never an empty box. */
export function ClassFallback({ cls }: { cls: string }) {
  return (
    <span
      className="stat flex size-full items-center justify-center font-bold text-background"
      style={{ background: `linear-gradient(135deg, ${classColor(cls)}, color-mix(in oklab, ${classColor(cls)}, black 40%))` }}
      aria-hidden
    >
      {classLabel(cls).charAt(0)}
    </span>
  );
}

export function ArtFallback() {
  return (
    <span className="flex size-full items-center justify-center text-muted-foreground" aria-hidden>
      <ImageOff className="size-4" />
    </span>
  );
}
