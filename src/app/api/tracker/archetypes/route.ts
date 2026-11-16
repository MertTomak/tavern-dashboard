import { NextResponse } from "next/server";
import { connection } from "next/server";
import { cardByDbf } from "@/lib/cards/catalog";
import { listArchetypeRules } from "@/lib/db/queries/archetypes";

/**
 * GET → the archetype rules, so the tracker can name the opponent's archetype
 * from the cards they have shown. Signature cards come with their names too:
 * the tracker matches by name, so any print of a card counts.
 */
export async function GET() {
  await connection();
  const archetypes = listArchetypeRules().map((r) => ({ ...r, signatureNames: r.signatureCards.map((id) => cardByDbf(id)?.name ?? String(id)) }));
  return NextResponse.json({ archetypes });
}
