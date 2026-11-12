import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { ResultChip } from "@/components/dashboard/ResultMark";
import { classColor, classLabel } from "@/lib/cards/class-colors";
import { t } from "@/i18n";
import { MotionPlayground } from "./MotionPlayground";
import { ArtFallback, ArtImage } from "@/components/cards/CardArt";
import { CardPreview } from "@/components/cards/CardPreview";
import { ClassPortrait } from "@/components/cards/ClassPortrait";
import { ART_KINDS, artSrc } from "@/lib/cards/art";

const SAMPLE_CARD = { id: "EX1_001", name: "Lightwarden" };

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

      <Panel title={copy.art} hint={copy.artHint}>
        <div className="grid gap-6 md:grid-cols-[auto_1fr]">
          <CardPreview cardId={SAMPLE_CARD.id} name={SAMPLE_CARD.name}>
            <button type="button" className="glow-hover w-fit rounded-md focus-visible:outline-2 focus-visible:outline-ring">
              <ArtImage
                src={artSrc("art", SAMPLE_CARD.id)}
                alt={SAMPLE_CARD.name}
                width={160}
                height={160}
                className="w-40 rounded-md"
                imgClassName="scale-[1.45]"
                fallback={<ArtFallback />}
              />
            </button>
          </CardPreview>
          <div className="grid content-start gap-4">
            <ArtImage
              src={artSrc("tile", SAMPLE_CARD.id)}
              alt={SAMPLE_CARD.name}
              width={ART_KINDS.tile.width}
              height={ART_KINDS.tile.height}
              className="w-64 rounded-xs"
              fallback={<ArtFallback />}
            />
            <ul className="flex flex-wrap gap-3">
              {CLASSES.map((cls) => (
                <li key={cls}>
                  <ClassPortrait cls={cls} size={40} />
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <ArtImage src={artSrc("art", "NO_SUCH_CARD")} alt="" width={40} height={40} className="w-10 rounded-md" fallback={<ArtFallback />} />
              {copy.artFallback}
            </div>
          </div>
        </div>
      </Panel>

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
