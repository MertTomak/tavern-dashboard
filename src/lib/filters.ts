import { z } from "zod";
import { GAME_FORMATS, GAME_MODES } from "@/lib/db/schema";

export const RANGES = ["today", "7d", "30d", "season", "all", "custom"] as const;
export type Range = (typeof RANGES)[number];
export const DEFAULT_RANGE: Range = "30d";

const filtersSchema = z.object({
  range: z.enum(RANGES).catch(DEFAULT_RANGE),
  mode: z.enum(GAME_MODES).optional().catch(undefined),
  format: z.enum(GAME_FORMATS).optional().catch(undefined),
});

export type Filters = z.infer<typeof filtersSchema>;

type RawParams = Record<string, string | string[] | undefined>;

/** URL search params -> validated filters. Unknown values fall back to defaults. */
export function parseFilters(params: RawParams): Filters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return filtersSchema.parse({
    range: first(params.range) ?? DEFAULT_RANGE,
    mode: first(params.mode),
    format: first(params.format),
  });
}

/** Milliseconds the zone is ahead of UTC at the given instant (Istanbul: +3h). */
function zoneOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** UTC instant of local midnight (in `timeZone`) for the day containing `now`, optionally the 1st of its month. */
function zonedMidnight(now: Date, timeZone: string, firstOfMonth: boolean): Date {
  const offset = zoneOffsetMs(now, timeZone);
  const local = new Date(now.getTime() + offset);
  const midnightLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    firstOfMonth ? 1 : local.getUTCDate(),
  );
  return new Date(midnightLocal - offset);
}

/** Start of the range as a UTC ISO string, or null for "all time". */
export function rangeStart(range: Range, now: Date, timeZone: string): string | null {
  const DAY = 24 * 3600 * 1000;
  switch (range) {
    case "today":
      return zonedMidnight(now, timeZone, false).toISOString();
    case "7d":
      return new Date(now.getTime() - 7 * DAY).toISOString();
    case "season":
      return zonedMidnight(now, timeZone, true).toISOString();
    case "all":
      return null;
    case "30d":
    case "custom": // custom dates arrive in Phase 2; until then it behaves like the default
      return new Date(now.getTime() - 30 * DAY).toISOString();
  }
}
