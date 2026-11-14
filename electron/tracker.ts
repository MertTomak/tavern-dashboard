import { z } from "zod";
import { loadAllCards, type CardIndex } from "@/lib/cards/all-cards";
import { MIN_CARDS } from "@/lib/import/deck-match";
import { deckFromCode } from "@/lib/tracker/deck";
import { TrackerLog } from "@/lib/tracker/game";
import { buildTrackerView, type TrackerDeck, type TrackerView } from "@/lib/tracker/view";
import type { QueuedGameDeck } from "@/lib/watcher/log-watcher";

/**
 * The live game behind the overlay. Gets every Power.log line from the log
 * watcher (same process, same read), keeps the game state, and hands a fresh
 * fair-play view to the overlay at most every UPDATE_MS.
 */
const UPDATE_MS = 50;
const deckMatchSchema = z.object({ deck: z.object({ name: z.string(), cards: z.array(z.object({ dbfId: z.number(), count: z.number() })) }).nullable() });

export class TrackerSession {
  private log = new TrackerLog();
  private cards: CardIndex = loadAllCards();
  private deck: TrackerDeck | null = null;
  private queued: QueuedGameDeck | null = null;
  private timer: NodeJS.Timeout | null = null;
  private live = false;
  private matchKey = "";

  constructor(
    private readonly appUrl: string,
    private readonly onView: (view: TrackerView) => void,
  ) {}

  /** A new Hearthstone session: start clean (card data may have been refreshed meanwhile). */
  reset(): void {
    this.log = new TrackerLog();
    this.cards = loadAllCards();
    this.deck = null;
    this.queued = null;
    this.live = false;
  }

  deckQueued(deck: QueuedGameDeck): void {
    this.queued = deck;
  }

  line(line: string, live: boolean): void {
    const before = this.log.game;
    if (!this.log.feed(line)) return;
    if (this.log.game !== before) this.newGame();
    if (live) {
      this.live = true;
      this.schedule();
    }
  }

  /** The watcher caught up with the log (or a game started or ended): show where things stand. */
  catchUp(): void {
    this.live = true;
    this.schedule();
  }

  get view(): TrackerView {
    return buildTrackerView(this.log.game, this.deck, this.cards);
  }

  private newGame() {
    // Each "Finding Game With Deck" belongs to one game.
    const queued = this.queued;
    this.queued = null;
    this.deck = queued ? deckFromCode(queued.code, queued.name) : null;
    this.matchKey = "";
  }

  private schedule() {
    if (this.timer || !this.live) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const view = this.view;
      this.onView(view);
      if (!this.deck && view.status === "playing") void this.matchDeck();
    }, UPDATE_MS);
  }

  /** No code from Decks.log: count down the saved deck that fits the cards seen so far, if one does. */
  private async matchDeck() {
    const game = this.log.game;
    if (!game || game.friendlyPlayerId === null) return;
    const hero = [...game.entities.values()].filter((e) => e.cardType === "HERO" && e.controller === game.friendlyPlayerId && e.cardId).sort((a, b) => a.id - b.id)[0];
    const cls = hero ? this.cards.byId(hero.cardId)?.cardClass : undefined;
    const seen = this.view.me.rows.flatMap((r) => this.cards.byId(r.cardId)?.dbfId ?? []);
    if (!cls || seen.length < MIN_CARDS) return;
    const key = `${cls}:${seen.join(",")}`;
    if (key === this.matchKey) return;
    this.matchKey = key;
    try {
      const res = await fetch(`${this.appUrl}/api/tracker/deck?class=${cls}&dbf=${seen.slice(0, 60).join(",")}`);
      const { deck } = deckMatchSchema.parse(await res.json());
      if (deck && this.log.game === game && !this.deck) {
        this.deck = { name: deck.name, source: "match", cards: deck.cards };
        this.schedule();
      }
    } catch {
      // Server busy or no match; the cards seen are shown meanwhile.
    }
  }
}
