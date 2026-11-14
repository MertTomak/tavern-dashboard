import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { TrackerOverlay } from "@/components/tracker/TrackerOverlay";
import { DEMO_VIEW } from "@/components/tracker/demo-view";
import { loadAllCards } from "@/lib/cards/all-cards";
import type { TrackerView } from "@/lib/tracker/view";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.tracker.title };

/** The made-up demo game, with names and costs from the local card data so they match the art. */
function demoView(): TrackerView {
  const cards = loadAllCards();
  const named = <T extends { cardId: string | null; name: string | null; cost: number | null }>(r: T): T => {
    const c = r.cardId ? cards.byId(r.cardId) : undefined;
    return c ? { ...r, name: c.name, cost: c.cost ?? r.cost } : r;
  };
  return {
    ...DEMO_VIEW,
    me: { ...DEMO_VIEW.me, rows: DEMO_VIEW.me.rows.map((r) => ({ ...named(r), name: cards.byId(r.cardId)?.name ?? r.name })).sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0)) },
    opponent: { ...DEMO_VIEW.opponent, played: DEMO_VIEW.opponent.played.map(named) },
  };
}

async function Overlay({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const demo = (await searchParams).demo === "1";
  return <TrackerOverlay demo={demo ? demoView() : null} />;
}

/** Loaded by the Mac app's transparent overlay window; `?demo=1` shows a made-up game in a browser. */
export default function OverlayPage(props: PageProps<"/overlay">) {
  return (
    <Suspense>
      <Overlay searchParams={props.searchParams} />
    </Suspense>
  );
}
