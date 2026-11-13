/**
 * Power.log lines carry only a time of day. The date comes from the session
 * folder name (Hearthstone_YYYY_MM_DD_HH_MM_SS); the clock rolls the date
 * forward when the time of day jumps back (midnight). Times are local to the
 * Mac and converted to UTC with the given time zone.
 */

const DAY = 24 * 60 * 60 * 1000;
/** A backwards jump bigger than this is midnight, not log jitter. */
const ROLLOVER = 6 * 60 * 60 * 1000;

export type LocalDate = { y: number; m: number; d: number };
export type SessionStart = LocalDate & { clock: number };

/** Session start from a folder name like Hearthstone_2026_11_13_22_32_43, or null. */
export function sessionFromFolder(name: string): SessionStart | null {
  const m = /Hearthstone_(\d{4})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{2})/.exec(name);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  if (!y || !mo || !d || h === undefined || mi === undefined || s === undefined) return null;
  return { y, m: mo, d, clock: ((h * 60 + mi) * 60 + s) * 1000 };
}

/** Offset (ms) of `timeZone` from UTC at a given instant. */
function zoneOffset(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** A local wall-clock time in `timeZone` → UTC epoch ms (DST-safe: corrected once). */
export function localToUtc(date: LocalDate, clock: number, timeZone: string): number {
  const naive = Date.UTC(date.y, date.m - 1, date.d) + clock;
  const first = naive - zoneOffset(naive, timeZone);
  return naive - zoneOffset(first, timeZone);
}

/** Tracks the date across a log: feed every line's clock in order, get UTC times back. */
export class LogClock {
  private dayShift = 0;
  private last: number;

  constructor(
    private readonly start: SessionStart,
    private readonly timeZone: string,
  ) {
    this.last = start.clock;
  }

  /** UTC epoch ms for a line's local clock. */
  at(clock: number): number {
    if (clock + ROLLOVER < this.last) this.dayShift++;
    this.last = clock;
    const base = Date.UTC(this.start.y, this.start.m - 1, this.start.d) + this.dayShift * DAY;
    const day = new Date(base);
    return localToUtc({ y: day.getUTCFullYear(), m: day.getUTCMonth() + 1, d: day.getUTCDate() }, clock, this.timeZone);
  }
}

/** Session start from a moment (old single-file logs: the file's creation time), as local time in `timeZone`. */
export function sessionFromDate(date: Date, timeZone: string): SessionStart {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day"), clock: ((get("hour") * 60 + get("minute")) * 60 + get("second")) * 1000 };
}

/** What a quick first pass over a log learns about its clock: first and last time of day and midnights crossed. */
export type ClockScan = { first: number; last: number; rollovers: number };

/** Feeds line clocks in order; same midnight rule as LogClock. */
export function scanClock(scan: ClockScan | null, clock: number): ClockScan {
  if (!scan) return { first: clock, last: clock, rollovers: 0 };
  return { first: scan.first, last: clock, rollovers: scan.rollovers + (clock + ROLLOVER < scan.last ? 1 : 0) };
}

/**
 * Session start for a log that arrives without its folder name (an uploaded file):
 * the file's last write is when its last line was written, so walk back from that
 * date over the midnights the log crossed.
 */
export function sessionFromLastWrite(lastWrite: Date, scan: ClockScan, timeZone: string): SessionStart {
  const end = sessionFromDate(lastWrite, timeZone);
  // The last line can't be later in the day than the file's last write; if it is, the write happened after midnight.
  const endShift = scan.last > end.clock + 5 * 60_000 ? 1 : 0;
  const day = new Date(Date.UTC(end.y, end.m - 1, end.d) - (scan.rollovers + endShift) * DAY);
  return { y: day.getUTCFullYear(), m: day.getUTCMonth() + 1, d: day.getUTCDate(), clock: scan.first };
}
