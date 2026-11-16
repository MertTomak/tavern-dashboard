import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { z } from "zod";
import { TrackerPanel } from "@/components/tracker/TrackerPanel";
import { TrackerStage } from "@/components/tracker/TrackerStage";
import { DEMO_VIEW } from "@/components/tracker/demo-view";
import { loadAllCards } from "@/lib/cards/all-cards";
import { PANEL_IDS } from "@/lib/tracker/layout";
import type { TrackerView } from "@/lib/tracker/view";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.tracker.title };

const paramsSchema = z.object({
  panel: z.enum(PANEL_IDS).optional().catch(undefined),
  demo: z.literal("1").optional().catch(undefined),
  /** Made-up screen for the layout check, e.g. 1440x900. */
  screen: z
    .string()
    .regex(/^\d{3,4}x\d{3,4}$/)
    .catch("1440x900"),
  hs: z.enum(["max", "window"]).catch("max"),
  /** `deck=none` shows the demo without a deck list (the "Pick your deck" fallback). */
  deck: z.enum(["code", "none"]).catch("code"),
});

/** The made-up demo game, with names and costs from the local card data so they match the art. */
function demoView(withDeck: boolean): TrackerView {
  const cards = loadAllCards();
  const named = <T extends { cardId: string | null; name: string | null; cost: number | null }>(r: T): T => {
    const c = r.cardId ? cards.byId(r.cardId) : undefined;
    return c ? { ...r, name: c.name, cost: c.cost ?? r.cost } : r;
  };
  const rows = DEMO_VIEW.me.rows.map(named).sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0) || a.name.localeCompare(b.name));
  return {
    ...DEMO_VIEW,
    deck: withDeck ? DEMO_VIEW.deck : { name: null, source: "seen" },
    me: { ...DEMO_VIEW.me, rows: withDeck ? rows : rows.filter((r) => r.seen > 0).map((r) => ({ ...r, total: null, left: null, drawChance: null })) },
    opponent: { ...DEMO_VIEW.opponent, rows: DEMO_VIEW.opponent.rows.map(named).sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0) || a.name.localeCompare(b.name)) },
  };
}

async function Overlay({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const params = paramsSchema.parse({ panel: first(raw.panel), demo: first(raw.demo), screen: first(raw.screen) ?? "1440x900", hs: first(raw.hs) ?? "max", deck: first(raw.deck) ?? "code" });
  const demo = params.demo ? demoView(params.deck === "code") : null;
  if (demo && !params.panel) {
    const [width, height] = params.screen.split("x").map(Number);
    return <TrackerStage demo={demo} screen={{ width, height }} windowed={params.hs === "window"} />;
  }
  return <TrackerPanel panel={params.panel ?? "deck"} demo={demo} />;
}

/**
 * Loaded by the Mac app's transparent tracker windows (`?panel=deck`, `?panel=opponent`).
 * In a browser, `?demo=1` shows both panels with a made-up game on a made-up screen
 * (`&screen=1512x982&hs=window`) to check the layout.
 */
export default function OverlayPage(props: PageProps<"/overlay">) {
  return (
    <Suspense>
      <Overlay searchParams={props.searchParams} />
    </Suspense>
  );
}
