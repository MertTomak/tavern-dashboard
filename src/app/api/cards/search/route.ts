import { NextResponse } from "next/server";
import { searchCards } from "@/lib/cards/catalog";
import { cardSearchSchema } from "@/lib/validation/archetypes";

/** GET ?q=&cls= → up to 12 collectible cards of that class or neutral whose name contains q (for the archetype editor). */
export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = cardSearchSchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ cards: [] });
  const cards = searchCards(parsed.data.q, parsed.data.cls).map((c) => ({ dbfId: c.dbfId, card: { id: c.id, name: c.name, cost: c.cost ?? null, rarity: c.rarity ?? null } }));
  return NextResponse.json({ cards });
}
