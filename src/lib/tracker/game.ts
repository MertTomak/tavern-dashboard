import { entityField, entityRef, tokenize, type EntityRef } from "@/lib/parser/tokenizer";

/**
 * Live game state for the deck tracker, read from Power.log one line at a time.
 * Holds what the log says about every entity; what may be *shown* is decided
 * in view.ts (fair play: only what the player can see in the game).
 *
 * Kept separate from the importer's parser (parser/game-state.ts): that one
 * builds one record per finished game, this one answers "what is true now".
 */

export type TrackedEntity = {
  id: number;
  controller: number | null;
  /** Latest CardID the log gave for this entity ("" while hidden). */
  cardId: string;
  /** The first CardID it had (a card transformed in hand still counts as the deck card it was). */
  firstCardId: string;
  zone: string | null;
  /** The zone it was first seen in, and whether it existed before the mulligan (= started in a deck or hand). */
  firstZone: string | null;
  createdInSetup: boolean;
  cardType: string | null;
  isCoin: boolean;
  /** Been in a zone both players see (play, graveyard, removed): its face is public from then on. */
  wasPublic: boolean;
};

type Player = { entityId: number; playerId: number; name: string | null };

const UNKNOWN_PLAYER = "UNKNOWN HUMAN PLAYER";
const PUBLIC_ZONES = new Set(["PLAY", "GRAVEYARD", "REMOVEDFROMGAME"]);

export class TrackerGame {
  readonly entities = new Map<number, TrackedEntity>();
  readonly players = new Map<number, Player>();
  /** Entity ids of the cards the opponent played, in order (hero powers left out). */
  readonly opponentPlayed: number[] = [];
  friendlyPlayerId: number | null = null;
  gameTurn = 0;
  setupOver = false;
  mainStarted = false;
  complete = false;
  private current: number | null = null;
  private pendingReveal: { id: number; cardId: string; shown: boolean } | null = null;

  /** Own turn number, counting both players' turns as one round (1, 1, 2, 2 …). */
  get turn(): number {
    return Math.max(1, Math.ceil(this.gameTurn / 2));
  }

  get opponentPlayerId(): number | null {
    if (this.friendlyPlayerId === null) return null;
    for (const p of this.players.values()) if (p.playerId !== this.friendlyPlayerId) return p.playerId;
    return null;
  }

  /** Feeds one Power.log line; returns true when something the tracker shows may have changed. */
  feed(method: string, body: string): boolean {
    if (method !== "DebugPrintPower") {
      this.close();
      if (method === "DebugPrintGame") this.gameInfo(body);
      return false;
    }
    let m: RegExpExecArray | null;
    if ((m = /^tag=(\w+) value=(\S+)/.exec(body))) {
      if (this.current !== null && m[1] && m[2]) this.setTag(this.current, m[1], m[2]);
      return true;
    }
    this.close();
    if ((m = /^GameEntity EntityID=(\d+)/.exec(body))) {
      this.current = Number(m[1]);
    } else if ((m = /^Player EntityID=(\d+) PlayerID=(\d+)/.exec(body))) {
      const entityId = Number(m[1]);
      this.players.set(entityId, { entityId, playerId: Number(m[2]), name: null });
      this.current = entityId;
    } else if ((m = /^FULL_ENTITY - Creating ID=(\d+) CardID=(\S*)/.exec(body))) {
      const e = this.entity(Number(m[1]));
      e.createdInSetup = !this.setupOver;
      this.current = e.id;
      if (m[2]) this.pendingReveal = { id: e.id, cardId: m[2], shown: false };
    } else if ((m = /^(FULL_ENTITY|SHOW_ENTITY|CHANGE_ENTITY) - Updating (?:Entity=)?(.*) CardID=(\S*)$/.exec(body))) {
      const id = m[2] ? this.resolve(entityRef(m[2])) : null;
      this.current = id;
      if (id !== null && m[3]) this.pendingReveal = { id, cardId: m[3], shown: m[1] === "SHOW_ENTITY" };
    } else if (body.startsWith("HIDE_ENTITY ")) {
      // The card went back out of sight (e.g. shuffled into the deck): its identity is hidden again.
      const raw = entityField(body);
      const id = raw ? this.resolve(entityRef(raw)) : null;
      const tag = /\btag=(\w+) value=(\S+)/.exec(body);
      if (id !== null && tag?.[1] && tag[2]) this.setTag(id, tag[1], tag[2]);
    } else if (body.startsWith("TAG_CHANGE ")) {
      const raw = entityField(body);
      const tag = /\btag=(\w+) value=(\S+)/.exec(body);
      const id = raw ? this.resolve(entityRef(raw)) : null;
      if (id !== null && tag?.[1] && tag[2]) this.setTag(id, tag[1], tag[2]);
    } else if (body.startsWith("BLOCK_START BlockType=PLAY ")) {
      const raw = entityField(body);
      const id = raw ? this.resolve(entityRef(raw)) : null;
      if (id !== null) this.played(id);
    } else return false;
    return true;
  }

  // ---- entities and tags ----

  private entity(id: number): TrackedEntity {
    let e = this.entities.get(id);
    if (!e) {
      e = { id, controller: null, cardId: "", firstCardId: "", zone: null, firstZone: null, createdInSetup: false, cardType: null, isCoin: false, wasPublic: false };
      this.entities.set(id, e);
    }
    return e;
  }

  /** A FULL/SHOW_ENTITY's CardID is applied after its own tag lines (zone, controller) have been read. */
  private close() {
    const r = this.pendingReveal;
    this.pendingReveal = null;
    this.current = null;
    if (!r) return;
    const e = this.entity(r.id);
    e.cardId = r.cardId;
    if (!e.firstCardId) e.firstCardId = r.cardId;
    // Before the opening hands are settled only our own hand is shown to us: that side is the friendly player.
    if (r.shown && !this.mainStarted && this.friendlyPlayerId === null && e.zone === "HAND" && e.controller !== null) this.friendlyPlayerId = e.controller;
  }

  private setTag(id: number, tag: string, value: string) {
    if (id === 1) {
      if (tag === "TURN") this.gameTurn = Number(value) || this.gameTurn;
      else if (tag === "STEP" && value === "BEGIN_MULLIGAN") this.setupOver = true;
      else if (tag === "STEP" && value === "MAIN_READY") {
        this.setupOver = true;
        this.mainStarted = true;
      } else if (tag === "STATE" && value === "COMPLETE") this.complete = true;
      return;
    }
    if (this.players.has(id)) return;
    const e = this.entity(id);
    switch (tag) {
      case "CONTROLLER":
        e.controller = Number(value);
        break;
      case "CARDTYPE":
        e.cardType = value;
        break;
      case "COIN_CARD":
        e.isCoin = value === "1";
        break;
      case "ZONE":
        this.moveZone(e, value);
        break;
    }
  }

  private moveZone(e: TrackedEntity, to: string) {
    const from = e.zone;
    e.zone = to;
    if (from === null) e.firstZone = to;
    if (PUBLIC_ZONES.has(to)) e.wasPublic = true;
    // Shuffled back into a deck: no longer known to us (the game hides it again).
    if (to === "DECK" && from !== null && e.controller !== this.friendlyPlayerId) e.wasPublic = false;
  }

  private played(id: number) {
    const e = this.entity(id);
    if (e.cardType === "HERO_POWER") return;
    if (this.friendlyPlayerId !== null && e.controller !== null && e.controller !== this.friendlyPlayerId) {
      this.opponentPlayed.push(id);
    }
  }

  // ---- players (names stay in memory only) ----

  private gameInfo(body: string) {
    const m = /^PlayerID=(\d+), PlayerName=(.+)$/.exec(body);
    if (!m) return;
    const name = m[2]?.trim() ?? "";
    for (const p of this.players.values()) if (p.playerId === Number(m[1]) && name && name !== UNKNOWN_PLAYER) p.name = name;
  }

  private resolve(ref: EntityRef): number | null {
    if ("id" in ref) return ref.id;
    if (ref.name === "GameEntity") return 1;
    for (const p of this.players.values()) if (p.name === ref.name) return p.entityId;
    const unnamed = [...this.players.values()].filter((p) => p.name === null);
    if (unnamed.length === 1 && unnamed[0]) {
      if (ref.name !== UNKNOWN_PLAYER) unnamed[0].name = ref.name;
      return unnamed[0].entityId;
    }
    return null;
  }
}

/**
 * Follows a Power.log across games: a new CREATE_GAME starts a fresh TrackerGame.
 * The finished game stays readable (the overlay fades it out) until the next one.
 */
export class TrackerLog {
  game: TrackerGame | null = null;

  /** Returns true when the tracker view may have changed. */
  feed(line: string): boolean {
    const tok = tokenize(line);
    if (!tok) return false;
    if (tok.method === "DebugPrintPower" && tok.body === "CREATE_GAME") {
      this.game = new TrackerGame();
      return true;
    }
    return this.game?.feed(tok.method, tok.body) ?? false;
  }
}
