/** One card whose count changed between two versions of a deck: `from` → `to` copies (0 = not in that list). */
export type CardChange = { dbfId: number; from: number; to: number };

/**
 * Card differences from one deck list to the next: cards added (+), removed
 * (−) or with a changed count. Sorted removed first, then added; by dbfId inside.
 */
export function versionDiff(before: readonly { dbfId: number; count: number }[], after: readonly { dbfId: number; count: number }[]): CardChange[] {
  const from = new Map(before.map((c) => [c.dbfId, c.count]));
  const to = new Map(after.map((c) => [c.dbfId, c.count]));
  const out: CardChange[] = [];
  for (const id of new Set([...from.keys(), ...to.keys()])) {
    const a = from.get(id) ?? 0;
    const b = to.get(id) ?? 0;
    if (a !== b) out.push({ dbfId: id, from: a, to: b });
  }
  return out.sort((x, y) => Math.sign(x.to - x.from) - Math.sign(y.to - y.from) || x.dbfId - y.dbfId);
}
