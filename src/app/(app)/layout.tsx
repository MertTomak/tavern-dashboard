import { Suspense } from "react";
import { MobileNav, Sidebar } from "@/components/layout/Sidebar";
import { FilterBar } from "@/components/layout/FilterBar";

export default function AppShellLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <MobileNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-[57px] border-b border-border" />}>
          <FilterBar />
        </Suspense>
        <main className="w-full max-w-[1480px] flex-1 px-4 pt-8 pb-16 md:px-8">{children}</main>
      </div>
    </div>
  );
}
