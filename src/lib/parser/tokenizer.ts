/**
 * Power.log line → time + source + body. Only GameState lines are kept: the
 * client prints every event twice (GameState and PowerTaskList), and reading
 * both would count everything double.
 */

export type LogLine = {
  /** Milliseconds since local midnight (the log has no date). */
  clock: number;
  /** e.g. "DebugPrintPower", "DebugPrintGame", "DebugPrintEntityChoices". */
  method: string;
  /** The text after " - ", leading indentation removed. */
  body: string;
};

const LINE = /^D (\d{2}):(\d{2}):(\d{2})\.(\d{1,7}) GameState\.(\w+)\(\) - (.*)$/;

export function tokenize(line: string): LogLine | null {
  const m = LINE.exec(line);
  if (!m) return null;
  const [, h, mi, s, frac, method, body] = m;
  if (!h || !mi || !s || !frac || !method || body === undefined) return null;
  const ms = Math.floor(Number(`0.${frac}`) * 1000);
  return { clock: ((Number(h) * 60 + Number(mi)) * 60 + Number(s)) * 1000 + ms, method, body: body.trim() };
}

/**
 * An entity reference as the log writes it: a number ("74"), a name
 * ("GameEntity", a player's BattleTag), or a bracket "[entityName=… id=17 … player=1]".
 */
export type EntityRef = { id: number } | { name: string };

export function entityRef(raw: string): EntityRef {
  const bracket = /\bid=(\d+)/.exec(raw);
  if (raw.startsWith("[") && bracket?.[1]) return { id: Number(bracket[1]) };
  if (/^\d+$/.test(raw)) return { id: Number(raw) };
  return { name: raw };
}

/** Pulls `Entity=<ref>` out of a body, coping with bracketed names that contain spaces and '='. */
export function entityField(body: string, key = "Entity"): string | null {
  const start = body.indexOf(`${key}=`);
  if (start < 0) return null;
  const rest = body.slice(start + key.length + 1);
  if (rest.startsWith("[")) {
    // Bracketed refs can nest one level ("[cardType=INVALID]").
    let depth = 0;
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === "[") depth++;
      else if (rest[i] === "]" && --depth === 0) return rest.slice(0, i + 1);
    }
    return rest;
  }
  // A plain ref ends at the next " key=" (names such as "UNKNOWN HUMAN PLAYER" contain spaces).
  const end = rest.search(/\s\w+=/);
  return (end < 0 ? rest : rest.slice(0, end)).trim();
}
