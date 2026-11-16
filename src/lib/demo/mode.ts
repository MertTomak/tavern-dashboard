/**
 * Demo mode: the dashboard runs on a built-in, generated dataset (plus the
 * anonymised fixture logs), read-only, with no watcher and no Mac app.
 * Turned on at build time with NEXT_PUBLIC_DEMO=1 (`npm run dev:demo`,
 * `npm run build:demo`), so server and browser code see the same value.
 */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

/** What a write request gets back in demo mode. */
export const DEMO_READ_ONLY_ERROR = "This is a read-only demo, so nothing is saved.";
