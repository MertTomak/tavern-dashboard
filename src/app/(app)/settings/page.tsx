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
import { ArchetypesCard, type ArchetypeItem } from "@/components/settings/ArchetypesCard";
import { listArchetypes } from "@/lib/db/queries/archetypes";
import { logConfigStatus } from "@/lib/logs/log-config-file";
import { currentWatcherStatus } from "@/lib/watcher/status";
import { FramePanel } from "@/components/tavern/FramePanel";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Skeleton } from "@/components/ui/skeleton";
import { getDemoCounts } from "@/lib/db/queries/demo";
import { getClassArtChoices, getEffectsLevel } from "@/lib/db/queries/preferences";
import { loadClasses } from "@/lib/cards/classes";
import { classArtOptions, effectiveClassArt, tileCardsByDbf } from "@/lib/cards/catalog";
import { classLabel } from "@/lib/cards/class-colors";
import { IS_DEMO } from "@/lib/demo/mode";
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
  const archetypes = listArchetypes();
  const tiles = tileCardsByDbf(archetypes.flatMap((a) => a.signatureCards));
  const items: ArchetypeItem[] = archetypes.map((a) => ({
    id: a.id,
    name: a.name,
    playerClass: a.playerClass,
    classLabel: classLabel(a.playerClass),
    minMatches: a.minMatches,
    games: a.games,
    cards: a.signatureCards
      .flatMap((dbfId) => {
        const card = tiles.get(dbfId);
        return card ? [{ dbfId, card }] : [];
      })
      .sort((x, y) => (x.card.cost ?? 0) - (y.card.cost ?? 0) || x.card.name.localeCompare(y.card.name)),
  }));
  return (
    <>
      {IS_DEMO ? (
        <StaggerItem>
          <p className="rounded-lg border border-brass/25 bg-oak-deep/60 px-4 py-3 text-sm text-ink-muted">{t.demo.settingsNote}</p>
        </StaggerItem>
      ) : (
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
        </>
      )}
      <StaggerItem>
        <ArchetypesCard items={items} classes={rows.map((r) => ({ cls: r.cls, label: r.label }))} />
      </StaggerItem>
      <StaggerItem>
        <ClassArtCard rows={rows} />
      </StaggerItem>
      <StaggerItem>
        <EffectsCard level={getEffectsLevel()} />
      </StaggerItem>
      {!IS_DEMO && (
        <StaggerItem>
          <DemoDataCard games={demo.games} decks={demo.decks} />
        </StaggerItem>
      )}
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
