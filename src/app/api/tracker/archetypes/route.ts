import { NextResponse } from "next/server";
import { connection } from "next/server";
import { listArchetypeRules } from "@/lib/db/queries/archetypes";

/** GET → the archetype rules, so the tracker can name the opponent's archetype from the cards they have shown. */
export async function GET() {
  await connection();
  return NextResponse.json({ archetypes: listArchetypeRules() });
}
