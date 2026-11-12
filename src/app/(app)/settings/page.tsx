import { Suspense } from "react";
import { connection } from "next/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppearanceCard } from "@/components/settings/AppearanceCard";
import { DemoDataCard } from "@/components/settings/DemoDataCard";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Skeleton } from "@/components/ui/skeleton";
import { getDemoCounts } from "@/lib/db/queries/demo";
import { t } from "@/i18n";

async function DemoSection() {
  // The DB is local and changes at any time: read it per request, never at build time.
  await connection();
  const demo = getDemoCounts();
  return <DemoDataCard games={demo.games} decks={demo.decks} />;
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title={t.pages.settings.title} description={t.pages.settings.description} />
      <Stagger className="grid max-w-3xl grid-cols-1 gap-4">
        <StaggerItem>
          <AppearanceCard />
        </StaggerItem>
        <StaggerItem>
          <Suspense fallback={<Skeleton className="h-40 w-full rounded-lg" />}>
            <DemoSection />
          </Suspense>
        </StaggerItem>
      </Stagger>
    </>
  );
}
