"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

/** Shown when a page fails to load. Never shows a stack trace. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-8 md:px-8">
      <section role="alert" className="brass-frame brass-studs relative rounded-lg p-8 [--frame-fill:#1a130ef2] md:p-12">
        <TriangleAlert className="size-7 text-loss" aria-hidden />
        <h1 className="mt-3 font-display text-4xl font-semibold text-title-gold">{t.errors.title}</h1>
        <p className="mt-2 max-w-[60ch] text-parchment">{t.errors.body}</p>
        <Button size="lg" className="mt-6 px-5" onClick={reset}>
          <RotateCcw aria-hidden />
          {t.errors.retry}
        </Button>
      </section>
    </div>
  );
}
