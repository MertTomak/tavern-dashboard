import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="brass-frame brass-studs relative w-full max-w-lg rounded-lg p-8 text-center [--frame-fill:#1a130ef2] md:p-12">
        <Compass className="mx-auto size-8 text-brass" aria-hidden />
        <h1 className="mt-3 font-display text-4xl font-semibold text-title-gold">{t.errors.notFoundTitle}</h1>
        <p className="mt-2 text-parchment">{t.errors.notFoundBody}</p>
        <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-6 px-5")}>
          {t.errors.home}
        </Link>
      </section>
    </main>
  );
}
