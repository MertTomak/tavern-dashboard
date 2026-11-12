import { LOCALE, TIME_ZONE } from "@/i18n";

const numberFmt = new Intl.NumberFormat(LOCALE);
const percentFmt = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const dateFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
});

/** 1284 -> "1,284" */
export const formatNumber = (n: number): string => numberFmt.format(n);

/** 0.543 -> "54.3%" */
export const formatPercent = (ratio: number): string => percentFmt.format(ratio);

/** UTC ISO string -> "12 Nov 2026" (Europe/Istanbul) */
export const formatDate = (iso: string): string => dateFmt.format(new Date(iso));

/** UTC ISO string -> "12 Nov 2026, 21:40" (Europe/Istanbul) */
export const formatDateTime = (iso: string): string => dateTimeFmt.format(new Date(iso));

const shortDateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
});

/** UTC ISO string -> "12 Nov, 21:40" (Europe/Istanbul) */
export const formatShortDateTime = (iso: string): string => shortDateTimeFmt.format(new Date(iso));

/** 432 -> "7m 12s" */
export const formatDuration = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
};

/** Difference of two ratios in percentage points: 0.041 -> "+4.1 pts", -0.02 -> "−2.0 pts" */
export const formatPointsDelta = (delta: number): string => {
  const pts = Math.abs(delta * 100).toFixed(1);
  return `${delta >= 0 ? "+" : "−"}${pts} pts`;
};
