import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { useTempDb } from "./setup";

let q: typeof import("@/lib/db/queries/archetypes");
let client: Awaited<ReturnType<typeof useTempDb>>;
let schema: typeof import("@/lib/db/schema");

beforeAll(async () => {
  client = await useTempDb();
  schema = await import("@/lib/db/schema");
  q = await import("@/lib/db/queries/archetypes");
});

function addGame(opponentClass: string, opponentCards: number[], friendlyCards: number[] = []): string {
  const id = randomUUID();
  client.db
    .insert(schema.games)
    .values({ id, playedAt: new Date().toISOString(), mode: "RANKED", format: "STANDARD", result: "WIN", playerClass: "MAGE", opponentClass, source: "POWER_LOG", sourceHash: id })
    .run();
  const events = [
    ...opponentCards.map((dbfId) => ({ gameId: id, side: "OPPOSING" as const, dbfId, event: "PLAYED" as const, turn: 2 })),
    ...friendlyCards.map((dbfId) => ({ gameId: id, side: "FRIENDLY" as const, dbfId, event: "PLAYED" as const, turn: 2 })),
  ];
  if (events.length) client.db.insert(schema.gameCardEvents).values(events).run();
  return id;
}

const archetypeOf = (id: string) => client.db.query.games.findFirst({ where: (g, { eq }) => eq(g.id, id) }).sync()?.opponentArchetypeId;

describe("archetype rules on a temporary database", () => {
  it("classifies past games when a rule is added, changed and deleted", () => {
    const aggro = addGame("PALADIN", [1, 2, 3]);
    const other = addGame("PALADIN", [9]);
    const mage = addGame("MAGE", [1, 2, 3]);
    // Our own cards never count.
    const mine = addGame("PALADIN", [], [1, 2, 3]);

    const { id, changed } = q.createArchetype({ name: "Aggro Paladin", playerClass: "PALADIN", signatureCards: [1, 2, 3, 4], minMatches: 2 });
    expect(changed).toBe(1);
    expect(archetypeOf(aggro)).toBe(id);
    expect(archetypeOf(other)).toBeNull();
    expect(archetypeOf(mage)).toBeNull();
    expect(archetypeOf(mine)).toBeNull();
    expect(q.listArchetypes()[0]).toMatchObject({ name: "Aggro Paladin", games: 1 });

    expect(q.updateArchetype(id, { name: "Aggro Paladin", playerClass: "PALADIN", signatureCards: [1, 2, 3, 4], minMatches: 4 })?.changed).toBe(1);
    expect(archetypeOf(aggro)).toBeNull();

    q.updateArchetype(id, { name: "Aggro Paladin", playerClass: "PALADIN", signatureCards: [1, 2, 3, 4], minMatches: 2 });
    expect(q.deleteArchetype(id)?.changed).toBe(0);
    expect(archetypeOf(aggro)).toBeNull();
    expect(q.deleteArchetype(id)).toBeNull();
  });
});
