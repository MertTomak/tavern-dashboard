/**
 * Decks.log (written when log.config has a [Decks] section). When you press
 * Play, Hearthstone writes the deck it queues with:
 *
 *   I 21:40:02.1234567 Finding Game With Deck:
 *   I 21:40:02.1234567 ### Big Spell Mage
 *   I 21:40:02.1234567 # Deck ID: 1234567890
 *   I 21:40:02.1234567 AAECAf0EBu…
 *
 * We read only these "Finding Game With Deck" blocks (not the list of all your
 * decks the game prints at login). Pure: lines in, queued decks out.
 */
export type QueuedDeck = {
  /** Time of day (ms since local midnight) of the "Finding Game" line. */
  clock: number;
  name: string | null;
  code: string;
};

const LINE = /^[A-Z] (\d{2}):(\d{2}):(\d{2})\.(\d{1,7}) (.*)$/;
const CODE = /^[A-Za-z0-9+/]{12,}={0,2}$/;
/** Block headers that announce the deck of the game being started. */
const STARTS = ["Finding Game With Deck:", "Starting Arena Game With Deck:"];

export class DecksLogReader {
  private block: { clock: number; name: string | null } | null = null;

  /** Returns the queued deck once its code line has been read. */
  feed(line: string): QueuedDeck | null {
    const m = LINE.exec(line);
    if (!m?.[1] || !m[2] || !m[3] || !m[4] || m[5] === undefined) return null;
    const clock = ((Number(m[1]) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000 + Math.floor(Number(`0.${m[4]}`) * 1000);
    const body = m[5].trim();
    if (STARTS.includes(body)) {
      this.block = { clock, name: null };
      return null;
    }
    if (!this.block) return null;
    if (body.startsWith("###")) {
      this.block.name = body.replace(/^#+\s*/, "").trim() || null;
      return null;
    }
    if (body.startsWith("#")) return null;
    const block = this.block;
    this.block = null;
    return CODE.test(body) ? { clock: block.clock, name: block.name, code: body } : null;
  }
}
