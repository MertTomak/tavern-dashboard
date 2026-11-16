import { deriveClasses, loadCards, type Card } from "./classes";

type Catalog = {
  byDbf: Map<number, Card>;
  byId: Map<string, Card>;
  heroCards: Card[];
  heroByClass: Map<string, string>;
  newestSet: string | null;
  featured: Card[];
  classArt: Map<string, string>;
  classes: string[];
};

const globalForCatalog = globalThis as unknown as { cardCatalog?: Catalog | null };

/** Pure: the default hero of each class is HERO_NN (e.g. HERO_08 = Jaina); otherwise any hero of that class. */
export function buildHeroMap(cards: readonly Card[]): Map<string, string> {
  const map = new Map<string, string>();
  const isDefault = (id: string) => /^HERO_\d+$/.test(id);
  for (const c of cards) {
    if (c.type !== "HERO" || !c.cardClass) continue;
    const current = map.get(c.cardClass);
    if (!current || (isDefault(c.id) && !isDefault(current))) map.set(c.cardClass, c.id);
  }
  return map;
}

/** Sets that are not expansions: skins, evergreen pools and events. */
const NOT_EXPANSIONS = new Set(["HERO_SKINS", "CORE", "LEGACY", "EXPERT1", "VANILLA", "BASIC", "EVENT", "PLACEHOLDER_202204"]);

const isLegendaryMinion = (c: Card) => c.rarity === "LEGENDARY" && c.type === "MINION";

/** Pure: the newest expansion = the set holding the newest legendary card (highest dbfId). */
export function findNewestSet(cards: readonly Card[]): string | null {
  let best: Card | null = null;
  for (const c of cards) {
    if (c.rarity !== "LEGENDARY" || !c.set || NOT_EXPANSIONS.has(c.set)) continue;
    if (!best || c.dbfId > best.dbfId) best = c;
  }
  return best?.set ?? null;
}

/** Pure: the newest set's legendaries, character minions first, then by dbfId. */
export function featuredLegendaries(cards: readonly Card[], set: string | null): Card[] {
  if (!set) return [];
  return cards
    .filter((c) => c.set === set && c.rarity === "LEGENDARY")
    .sort((a, b) => Number(isLegendaryMinion(b)) - Number(isLegendaryMinion(a)) || a.dbfId - b.dbfId);
}

/** Pure: the card of the day; the same all day long in the given time zone. */
export function pickDaily<T>(items: readonly T[], now: Date, timeZone: string): T | null {
  if (!items.length) return null;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const dayNumber = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  return items[dayNumber % items.length];
}

/**
 * Pure: art for each class. Newest set's legendary minion of that class; else that class's
 * newest legendary minion from any expansion; else its default hero.
 */
export function buildClassArt(cards: readonly Card[], newestSet: string | null, heroes: ReadonlyMap<string, string>): Map<string, string> {
  const map = new Map<string, Card>();
  for (const c of cards) {
    if (!c.cardClass || !isLegendaryMinion(c) || !c.set || NOT_EXPANSIONS.has(c.set)) continue;
    const cur = map.get(c.cardClass);
    const inNewest = (x: Card) => x.set === newestSet;
    if (!cur || (inNewest(c) && !inNewest(cur)) || (inNewest(c) === inNewest(cur) && c.dbfId > cur.dbfId)) {
      map.set(c.cardClass, c);
    }
  }
  const out = new Map<string, string>();
  for (const [cls, hero] of heroes) out.set(cls, map.get(cls)?.id ?? hero);
  return out;
}

const RARITY_RANK: Record<string, number> = { LEGENDARY: 4, EPIC: 3, RARE: 2, COMMON: 1, FREE: 0 };

/** Pure: the card that best represents a deck: rarest, then most expensive, then class cards first. */
export function pickSignatureCard(cards: readonly Card[], playerClass: string): Card | null {
  let best: Card | null = null;
  const score = (c: Card) =>
    (RARITY_RANK[c.rarity ?? ""] ?? 0) * 1000 + (c.cost ?? 0) * 10 + (c.cardClass === playerClass ? 1 : 0);
  for (const c of cards) {
    if (c.type === "HERO") continue;
    if (!best || score(c) > score(best)) best = c;
  }
  return best;
}

function catalog(): Catalog | null {
  if (globalForCatalog.cardCatalog !== undefined) return globalForCatalog.cardCatalog;
  const cards = loadCards();
  let value: Catalog | null = null;
  if (cards) {
    const heroByClass = buildHeroMap(cards);
    const newestSet = findNewestSet(cards);
    value = {
      byDbf: new Map(cards.map((c) => [c.dbfId, c])),
      byId: new Map(cards.map((c) => [c.id, c])),
      heroCards: cards.filter((c) => c.type === "HERO"),
      heroByClass,
      newestSet,
      featured: featuredLegendaries(cards, newestSet),
      classArt: buildClassArt(cards, newestSet, heroByClass),
      classes: deriveClasses(cards),
    };
  }
  globalForCatalog.cardCatalog = value;
  return value;
}

export function heroCardId(cls: string): string | null {
  return catalog()?.heroByClass.get(cls) ?? null;
}

/** Art card for a class (newest-set legendary minion); see buildClassArt. */
export function classArtId(cls: string): string | null {
  return catalog()?.classArt.get(cls) ?? null;
}

export function newestSetInfo(): { set: string | null; featured: Card[] } {
  const c = catalog();
  return { set: c?.newestSet ?? null, featured: c?.featured ?? [] };
}

export function cardsByDbf(dbfIds: readonly number[]): Card[] {
  const c = catalog();
  if (!c) return [];
  return dbfIds.flatMap((id) => {
    const card = c.byDbf.get(id);
    return card ? [card] : [];
  });
}

export type ClassArtOption = { id: string; name: string; kind: "newest" | "hero" | "skin" };

/** Pure: art choices for a class: the newest legendary (default), the default hero, then every hero skin. */
export function buildClassArtOptions(
  heroCards: readonly Card[],
  cls: string,
  newestId: string | null,
  newestName: string | null,
): ClassArtOption[] {
  const out: ClassArtOption[] = [];
  if (newestId && newestName && !/^HERO_/.test(newestId)) out.push({ id: newestId, name: newestName, kind: "newest" });
  const heroes = heroCards.filter((c) => c.cardClass === cls && (c.set === "HERO_SKINS" || /^HERO_\d+$/.test(c.id)));
  heroes.sort((a, b) => Number(/^HERO_\d+$/.test(b.id)) - Number(/^HERO_\d+$/.test(a.id)) || a.dbfId - b.dbfId);
  for (const h of heroes) out.push({ id: h.id, name: h.name, kind: /^HERO_\d+$/.test(h.id) ? "hero" : "skin" });
  return out;
}

export function classArtOptions(cls: string): ClassArtOption[] {
  const c = catalog();
  if (!c) return [];
  const newestId = c.classArt.get(cls) ?? null;
  return buildClassArtOptions(c.heroCards, cls, newestId, newestId ? (c.byId.get(newestId)?.name ?? null) : null);
}

/** The art to show for a class: the user's choice if it is still valid, else the default. */
export function effectiveClassArt(cls: string, choices: Readonly<Record<string, string>>): string | null {
  const chosen = choices[cls];
  if (chosen && classArtOptions(cls).some((o) => o.id === chosen)) return chosen;
  return classArtId(cls);
}

/** Card data for tiles and previews, keyed by dbfId. Unknown ids (e.g. cards newer than the local data) are absent. */
export function tileCardsByDbf(dbfIds: readonly number[]): Map<number, { id: string; name: string; cost: number | null; rarity: string | null }> {
  const c = catalog();
  const out = new Map<number, { id: string; name: string; cost: number | null; rarity: string | null }>();
  if (!c) return out;
  for (const id of new Set(dbfIds)) {
    const card = c.byDbf.get(id);
    if (card) out.set(id, { id: card.id, name: card.name, cost: card.cost ?? null, rarity: card.rarity ?? null });
  }
  return out;
}

export function cardByDbf(dbfId: number): Card | undefined {
  return catalog()?.byDbf.get(dbfId);
}

/** Playable classes from the card data (a new class such as Monk appears without code changes). */
export function playableClasses(): string[] {
  return catalog()?.classes ?? [];
}

/** Pure: collectible cards of a class (and neutral ones) whose name contains the query, names that start with it first. */
export function filterCards(cards: Iterable<Card>, query: string, cls: string, limit = 12): Card[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: Card[] = [];
  for (const c of cards) {
    if (c.type === "HERO" && c.set === "HERO_SKINS") continue;
    if (c.cardClass !== cls && c.cardClass !== "NEUTRAL") continue;
    if (c.name.toLowerCase().includes(q)) hits.push(c);
  }
  const starts = (c: Card) => (c.name.toLowerCase().startsWith(q) ? 0 : 1);
  return hits.sort((a, b) => starts(a) - starts(b) || (a.cost ?? 0) - (b.cost ?? 0) || a.name.localeCompare(b.name)).slice(0, limit);
}

export function searchCards(query: string, cls: string, limit = 12): Card[] {
  const c = catalog();
  return c ? filterCards(c.byDbf.values(), query, cls, limit) : [];
}
