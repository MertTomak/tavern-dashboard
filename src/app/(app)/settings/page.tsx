import { Suspense } from "react";
import { connection } from "next/server";
import { Wind } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DemoDataCard } from "@/components/settings/DemoDataCard";
import { ClassArtCard, type ClassArtRow } from "@/components/settings/ClassArtCard";
import { EffectsCard } from "@/components/settings/EffectsCard";
import { DesktopAppCard } from "@/components/settings/DesktopAppCard";
import { LogConfigCard } from "@/components/settings/LogConfigCard";
import { WatcherCard } from "@/components/settings/WatcherCard";
import { logConfigStatus } from "@/lib/logs/log-config-file";
import { currentWatcherStatus } from "@/lib/watcher/status";
import { FramePanel } from "@/components/tavern/FramePanel";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Skeleton } from "@/components/ui/skeleton";
import { getDemoCounts } from "@/lib/db/queries/demo";
import { getClassArtChoices, getEffectsLevel } from "@/lib/db/queries/preferences";
import { loadClasses } from "@/lib/cards/classes";
import { classArtOptions, effectiveClassArt } from "@/lib/cards/catalog";
import { classLabel } from "@/lib/cards/class-colors";
import { t } from "@/i18n";

async function Sections() {
  // The DB is local and changes at any time: read it per request, never at build time.
  await connection();
  const demo = getDemoCounts();
  const choices = getClassArtChoices();
  const rows: ClassArtRow[] = loadClasses().map((cls) => {
    const current = effectiveClassArt(cls, choices) ?? "";
    return { cls, label: classLabel(cls), current, chosen: choices[cls] === current, options: classArtOptions(cls) };
  });
  return (
    <>
      <StaggerItem>
        <DesktopAppCard />
      </StaggerItem>
      <StaggerItem>
        <WatcherCard initial={currentWatcherStatus()} />
      </StaggerItem>
      <StaggerItem>
        <LogConfigCard initial={logConfigStatus()} />
      </StaggerItem>
      <StaggerItem>
        <ClassArtCard rows={rows} />
      </StaggerItem>
      <StaggerItem>
        <EffectsCard level={getEffectsLevel()} />
      </StaggerItem>
      <StaggerItem>
        <DemoDataCard games={demo.games} decks={demo.decks} />
      </StaggerItem>
    </>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-8 md:px-8">
      <PageHeader title={t.pages.settings.title} description={t.pages.settings.description} />
      <Stagger className="grid grid-cols-1 gap-6">
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg bg-card" />}>
          <Sections />
        </Suspense>
        <StaggerItem>
          <FramePanel title={t.settings.motion.title} action={<Wind className="size-4 text-brass" aria-hidden />}>
            <p className="max-w-[70ch] text-sm text-ink-muted">{t.settings.motion.body}</p>
          </FramePanel>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
