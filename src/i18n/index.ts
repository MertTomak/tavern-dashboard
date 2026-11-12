import { en, type Dictionary } from "./en";

/** Active UI dictionary. Swap this to change language; keys are identical across languages. */
export const t: Dictionary = en;

/** Locale used for number/date formatting (en-GB: 12 Nov 2026, 21:40, 54.3%). */
export const LOCALE = "en-GB";

/** The user's time zone. Data is stored in UTC and displayed in this zone. */
export const TIME_ZONE = "Europe/Istanbul";

export type { Dictionary };
