import { Suspense } from "react";
import { MedallionNav } from "@/components/tavern/MedallionNav";
import { FilterBar } from "@/components/layout/FilterBar";
import { t } from "@/i18n";

export default function AppShellLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen text-parchment md:flex">
      <MedallionNav />
      <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
        <Suspense fallback={<div className="h-[53px] border-b border-brass/15" />}>
          <FilterBar />
        </Suspense>
        <main className="flex-1">{children}</main>
        <footer className="mx-auto w-full max-w-[1180px] px-4 py-6 text-xs text-ink-muted md:px-8">{t.legal.trademark}</footer>
      </div>
    </div>
  );
}
