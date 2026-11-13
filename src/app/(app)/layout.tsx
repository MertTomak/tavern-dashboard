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
        <GameMenuBar />
        <Suspense fallback={<div className="h-[53px] border-b border-brass/15 bg-oak-deep/80" />}>
          <FilterBar />
        </Suspense>
      </AppChrome>
      <PageNavigator>
        <main className="min-w-0 flex-1 overflow-x-clip pb-24 md:pb-0">{children}</main>
      </PageNavigator>
      <footer className="mx-auto w-full max-w-[1180px] px-4 pt-6 pb-28 text-xs text-ink-muted md:px-8 md:pb-6">{t.legal.trademark}</footer>
      <MobileCoinBar />
      <LiveUpdates />
      <Suspense fallback={null}>
        <QuickAddMount />
      </Suspense>
    </div>
  );
}
