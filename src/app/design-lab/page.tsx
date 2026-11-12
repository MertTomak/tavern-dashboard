import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { ResultChip } from "@/components/dashboard/ResultMark";
import { classColor, classLabel } from "@/lib/cards/class-colors";
import { t } from "@/i18n";
import { MotionPlayground } from "./MotionPlayground";

export const metadata: Metadata = { title: t.designLab.title };

const TOKENS = ["background", "card", "sunken", "foreground", "muted-foreground", "primary", "brass-bright", "win", "loss", "tie"];
const CLASSES = ["DEATHKNIGHT", "DEMONHUNTER", "DRUID", "HUNTER", "MAGE", "PALADIN", "PRIEST", "ROGUE", "SHAMAN", "WARLOCK", "WARRIOR", "MONK"];

/** Living style guide for the Hearth design system. Development only. */
export default function StyleGuidePage() {
  if (process.env.NODE_ENV === "production") notFound();
  const copy = t.designLab;
  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:px-8">
      <PageHeader title={copy.title} description={copy.intro} />

      <Panel title={copy.colours}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {TOKENS.map((name) => (
            <li key={name} className="text-sm">
              <span className="mb-1.5 block h-12 rounded-xs border border-border" style={{ background: `var(--${name})` }} aria-hidden />
              <code className="text-xs text-muted-foreground">--{name}</code>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title={copy.results}>
          <div className="flex gap-2">
            <ResultChip result="WIN" />
            <ResultChip result="LOSS" />
            <ResultChip result="TIE" />
          </div>
        </Panel>
        <Panel title={copy.classColours}>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
            {CLASSES.map((cls) => (
              <li key={cls} className="flex items-center gap-2">
                <span className="h-3.5 w-1 rounded-full" style={{ background: classColor(cls) }} aria-hidden />
                {classLabel(cls)}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title={copy.type}>
        <div className="grid gap-4">
          <p className="font-display text-5xl font-semibold text-brass-bright">54.3%</p>
          <p className="text-sm text-muted-foreground">{copy.typeDisplay}</p>
          <p className="stat text-4xl font-bold">1,284 · 162–137 · 9m 7s</p>
          <p className="text-sm text-muted-foreground">{copy.typeStat}</p>
          <p className="max-w-prose">{t.settings.demo.description}</p>
          <p className="text-sm text-muted-foreground">{copy.typeBody}</p>
        </div>
      </Panel>

      <Panel title={copy.motion} hint={copy.motionIntro}>
        <MotionPlayground />
      </Panel>
    </main>
  );
}
