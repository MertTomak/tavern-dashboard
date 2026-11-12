import Link from "next/link";
import { connection } from "next/server";
import { Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { newestSetInfo } from "@/lib/cards/catalog";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { ArtCrop } from "./ArtCrop";
import { OPENS_IN } from "./nav-model";

type Page = keyof typeof t.comingSoon.pages;

/**
 * An honest placeholder for a page that is not built yet: what it will do, when it
 * arrives, and the way back. Each page gets its own legendary from the newest set.
 */
export async function ComingSoon({ page }: { page: Page }) {
  await connection();
  const href = `/${page}`;
  const phase = OPENS_IN[href] ?? 0;
  const { featured } = newestSetInfo();
  const keys = Object.keys(t.comingSoon.pages);
  const card = featured.length ? featured[(keys.indexOf(page) * 3 + 1) % featured.length] : null;
  const title = t.pages[page].title;

  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-8 md:px-8">
      <section className="brass-frame brass-studs relative isolate overflow-hidden rounded-lg [--frame-fill:#120d0a]">
        {card && (
          <div aria-hidden className="absolute inset-y-0 right-0 -z-10 w-[min(520px,70%)] [mask-image:linear-gradient(to_right,transparent,black_45%)]">
            <ArtCrop cardId={card.id} className="brightness-[0.55] saturate-[0.85]" />
          </div>
        )}
        <div className="grid max-w-[560px] gap-4 p-6 py-14 md:p-10 md:py-20">
          <p className="stat flex items-center gap-2 text-sm tracking-[0.14em] text-brass-dim uppercase">
            <Lock className="size-3.5" aria-hidden />
            {t.concepts.soon(phase)}
          </p>
          <h1 className="font-display text-5xl font-semibold text-title-gold">{title}</h1>
          <p className="text-lg text-parchment">{t.comingSoon.pages[page]}</p>
          <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-2 w-fit px-5")}>
            {t.comingSoon.back}
          </Link>
        </div>
      </section>
    </div>
  );
}
