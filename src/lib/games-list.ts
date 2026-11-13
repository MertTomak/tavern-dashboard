import { z } from "zod";
import { GAME_RESULTS } from "@/lib/db/schema";
import { CLASS_PATTERN } from "@/lib/cards/art";

/** Games page: list options that live in the URL next to the shared filters (range, mode, format). */

export const GAME_SORTS = ["date", "turns", "duration"] as const;
export type GameSort = (typeof GAME_SORTS)[number];
export type SortDir = "asc" | "desc";

export const PAGE_SIZE = 50;

/** Keys this page owns in the URL. */
export const LIST_KEYS = ["result", "opp", "deck", "sort", "dir", "page"] as const;

const schema = z.object({
  result: z.enum(GAME_RESULTS).optional().catch(undefined),
  opp: z.string().regex(CLASS_PATTERN).optional().catch(undefined),
  deck: z.union([z.literal("none"), z.coerce.number().int().positive()]).optional().catch(undefined),
  sort: z.enum(GAME_SORTS).catch("date"),
  dir: z.enum(["asc", "desc"]).catch("desc"),
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
});

export type GameListParams = z.infer<typeof schema>;

type RawParams = Record<string, string | string[] | undefined>;

export function parseGameListParams(params: RawParams): GameListParams {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return schema.parse({
    result: first(params.result),
    opp: first(params.opp),
    deck: first(params.deck),
    sort: first(params.sort) ?? "date",
    dir: first(params.dir) ?? "desc",
    page: first(params.page) ?? 1,
  });
}

/**
 * The query string after changing some list options. Defaults are dropped to
 * keep URLs short, and any change other than the page goes back to page 1.
 */
export function patchQuery(current: string, patch: Partial<Record<(typeof LIST_KEYS)[number], string | null>>): string {
  const next = new URLSearchParams(current);
  for (const [k, v] of Object.entries(patch)) {
    const isDefault = v === null || v === "" || v === "all" || (k === "sort" && v === "date") || (k === "dir" && v === "desc") || (k === "page" && v === "1");
    if (isDefault) next.delete(k);
    else next.set(k, v);
  }
  if (!("page" in patch)) next.delete("page");
  return next.toString();
}

/** Clicking a column: same column flips the direction, a new column starts with its natural order. */
export function nextSort(current: { sort: GameSort; dir: SortDir }, column: GameSort): { sort: GameSort; dir: SortDir } {
  if (current.sort === column) return { sort: column, dir: current.dir === "desc" ? "asc" : "desc" };
  return { sort: column, dir: "desc" };
}
