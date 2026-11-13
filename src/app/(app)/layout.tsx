import { Suspense } from "react";
import { GameMenuBar, MobileCoinBar } from "@/components/tavern/GameMenu";
import { AppChrome } from "@/components/layout/AppChrome";
import { FilterBar } from "@/components/layout/FilterBar";
import { PageNavigator } from "@/components/layout/PageNavigator";
import { LiveUpdates } from "@/components/layout/LiveUpdates";
import { QuickAddMount } from "@/components/quick-add/QuickAddMount";
import { t } from "@/i18n";

export default function AppShellLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col text-parchment">
      <AppChrome>
        {/* The menus read the path, which is runtime data on pages with an id (/games/[id]). */}
        <Suspense fallback={<div className="h-14 border-b border-brass/20 bg-oak-deep" />}>
          <GameMenuBar />
        </Suspense>
        <Suspense fallback={<div className="h-[53px] border-b border-brass/15 bg-oak-deep/80" />}>
          <FilterBar />
        </Suspense>
      </AppChrome>
      {/* No sideways overscroll, so Chrome's two-finger back/forward gesture never fires by accident. */}
      <div className="flex flex-1 flex-col overscroll-x-none">
        <main className="min-w-0 flex-1 overflow-x-clip pb-24 md:pb-0">{children}</main>
      </div>
      <Suspense fallback={null}>
        <PageNavigator />
      </Suspense>
      <footer className="mx-auto w-full max-w-[1180px] px-4 pt-6 pb-28 text-xs text-ink-muted md:px-8 md:pb-6">{t.legal.trademark}</footer>
      <Suspense fallback={null}>
        <MobileCoinBar />
      </Suspense>
      <LiveUpdates />
      <Suspense fallback={null}>
        <QuickAddMount />
      </Suspense>
    </div>
  );
}
