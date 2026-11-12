import { Suspense } from "react";
import { MobileNav, Sidebar } from "@/components/layout/Sidebar";
import { FilterBar } from "@/components/layout/FilterBar";
import { t } from "@/i18n";

export default function AppShellLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <MobileNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-[57px] border-b border-border" />}>
          <FilterBar />
        </Suspense>
        <main className="w-full max-w-[1480px] flex-1 px-4 pt-8 pb-12 md:px-8">{children}</main>
        <footer className="w-full max-w-[1480px] border-t border-hairline px-4 py-5 text-xs text-muted-foreground md:px-8">
          {t.legal.trademark}
        </footer>
      </div>
    </div>
  );
}
