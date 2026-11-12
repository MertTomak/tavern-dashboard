import { loadCards, type Card } from "./classes";

type Catalog = { byDbf: Map<number, Card>; heroByClass: Map<string, string> };

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
  const value = cards
    ? { byDbf: new Map(cards.map((c) => [c.dbfId, c])), heroByClass: buildHeroMap(cards) }
    : null;
  globalForCatalog.cardCatalog = value;
  return value;
}

export function heroCardId(cls: string): string | null {
  return catalog()?.heroByClass.get(cls) ?? null;
}

export function cardsByDbf(dbfIds: readonly number[]): Card[] {
  const c = catalog();
  if (!c) return [];
  return dbfIds.flatMap((id) => {
    const card = c.byDbf.get(id);
    return card ? [card] : [];
  });
}
