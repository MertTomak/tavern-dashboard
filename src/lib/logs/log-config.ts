/**
 * Hearthstone's log.config (an INI file) decides which logs the game writes.
 * We need [Power] (games, the tracker) and [Decks] (the deck you queue with).
 * Pure text in, text out: other sections and unknown keys are never touched,
 * so settings other trackers added stay as they are.
 */
export const REQUIRED_SECTIONS: Record<string, Record<string, string>> = {
  Power: { LogLevel: "1", FilePrinting: "true", ConsolePrinting: "false", ScreenPrinting: "false", Verbose: "true" },
  Decks: { LogLevel: "1", FilePrinting: "true", ConsolePrinting: "false", ScreenPrinting: "false", Verbose: "false" },
};

export type LogConfigChange =
  | { kind: "add-section"; section: string; lines: string[] }
  | { kind: "set-key"; section: string; key: string; from: string | null; to: string };

type Section = { name: string; start: number; end: number; keys: Map<string, { line: number; value: string }> };

function sectionsOf(lines: string[]): Section[] {
  const out: Section[] = [];
  let current: Section | null = null;
  lines.forEach((raw, i) => {
    const line = raw.trim();
    const header = /^\[([^\]]+)\]$/.exec(line);
    if (header?.[1]) {
      if (current) current.end = i;
      current = { name: header[1], start: i, end: lines.length, keys: new Map() };
      out.push(current);
      return;
    }
    const kv = /^([^=;#]+?)\s*=\s*(.*)$/.exec(line);
    if (current && kv?.[1] !== undefined && kv[2] !== undefined) current.keys.set(kv[1], { line: i, value: kv[2] });
  });
  return out;
}

/** What has to change for the game to write the logs we read (empty when all is well). */
export function logConfigChanges(text: string | null): LogConfigChange[] {
  const sections = sectionsOf((text ?? "").split(/\r?\n/));
  const changes: LogConfigChange[] = [];
  for (const [name, wanted] of Object.entries(REQUIRED_SECTIONS)) {
    const found = sections.find((s) => s.name === name);
    if (!found) {
      changes.push({ kind: "add-section", section: name, lines: [`[${name}]`, ...Object.entries(wanted).map(([k, v]) => `${k}=${v}`)] });
      continue;
    }
    for (const [key, to] of Object.entries(wanted)) {
      const have = found.keys.get(key)?.value ?? null;
      if (have?.toLowerCase() !== to) changes.push({ kind: "set-key", section: name, key, from: have, to });
    }
  }
  return changes;
}

/** The file after applying the changes; everything else is kept as written. */
export function fixLogConfig(text: string | null): string {
  const changes = logConfigChanges(text);
  const lines = text ? text.split(/\r?\n/) : [];
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  // Edit existing keys in place first (line numbers stay valid), then insert missing keys
  // at the end of their section from the bottom up, then append missing sections.
  const sections = sectionsOf(lines);
  const inserts: { at: number; line: string }[] = [];
  for (const c of changes) {
    if (c.kind !== "set-key") continue;
    const s = sections.find((x) => x.name === c.section);
    if (!s) continue;
    const existing = s.keys.get(c.key);
    if (existing) lines[existing.line] = `${c.key}=${c.to}`;
    else {
      // Insert after the section's last non-empty line.
      let at = s.end;
      while (at > s.start + 1 && (lines[at - 1] ?? "").trim() === "") at--;
      inserts.push({ at, line: `${c.key}=${c.to}` });
    }
  }
  inserts
    .map((ins, order) => ({ ...ins, order }))
    .sort((a, b) => b.at - a.at || b.order - a.order)
    .forEach((ins) => lines.splice(ins.at, 0, ins.line));
  for (const c of changes) {
    if (c.kind !== "add-section") continue;
    if (lines.length && lines[lines.length - 1]?.trim() !== "") lines.push("");
    lines.push(...c.lines);
  }
  return `${lines.join("\n")}\n`;
}
