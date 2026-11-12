import { Suspense } from "react";
import { connection } from "next/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { DemoDataCard } from "@/components/settings/DemoDataCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getDemoCounts } from "@/lib/db/queries/demo";
import { tr } from "@/i18n/tr";

async function DemoSection() {
  // The DB is local and changes at any time: read it per request, never at build time.
  await connection();
  const demo = getDemoCounts();
  return <DemoDataCard games={demo.games} decks={demo.decks} />;
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title={tr.pages.settings.title} description={tr.pages.settings.description} />
      <div className="grid max-w-3xl gap-4">
        <Suspense fallback={<Skeleton className="h-36 w-full rounded-xl" />}>
          <DemoSection />
        </Suspense>
      </div>
    </>
  );
}
