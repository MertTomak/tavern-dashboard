import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

function tokens(selector: ":root" | ".dark"): Record<string, string> {
  const start = css.indexOf(`\n${selector} {`);
  const block = css.slice(start, css.indexOf("\n}", start));
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)) out[m[1]] = m[2];
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Text colours that must reach WCAG AA (4.5:1) on every surface they sit on.
const TEXT_ON_SURFACES: [string, string[]][] = [
  ["foreground", ["background", "card", "muted", "sidebar"]],
  ["muted-foreground", ["background", "card", "muted", "sidebar"]],
  ["primary", ["background", "card", "sidebar"]],
  ["win", ["background", "card", "sidebar"]],
  ["loss", ["background", "card", "sidebar"]],
  ["primary-foreground", ["primary"]],
];

describe.each([":root", ".dark"] as const)("%s tokens", (selector) => {
  const t = tokens(selector);

  it.each(TEXT_ON_SURFACES)("%s passes AA on its surfaces", (fg, surfaces) => {
    for (const bg of surfaces) {
      expect(t[fg], `--${fg}`).toBeDefined();
      expect(contrast(t[fg], t[bg]), `--${fg} on --${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
