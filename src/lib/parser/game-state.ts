import { createHash } from "node:crypto";
import { entityField, entityRef, tokenize, type EntityRef } from "./tokenizer";
import { LogClock, type SessionStart } from "./time";
import { gameRecordSchema, isBattlegrounds, toFormat, toMode, type CardEvent, type GameRecord } from "./record";

/** Looks up a card's dbfId by its CardID; only collectible cards have one (tokens, The Coin, hero powers don't). */
export type DbfLookup = (cardId: string) => number | undefined;

export type ParserOptions = {
  /** Session folder name (or a stand-in for old single-file logs and uploads); kept on each record. */
  session: string;
  /** Local date and time the session started; line times are added to it. */
  start: SessionStart;
  timeZone: string;
  dbfOf: DbfLookup;
};

/** Why a finished game was not turned into a record (shown in import summaries). */
export type SkippedGame = { startedAt: string; reason: string };

type Entity = {
  id: number;
  controller: number | null;
  /** First CardID ever seen (a transformed card keeps counting as what it was drawn as). */
  cardId: string;
  zone: string | null;
  cardType: string | null;
  cls: string | null;
  /** Created during setup (before the mulligan). */
  createdInSetup: boolean;
  /** The zone the entity was first seen in. */
  firstZone: string | null;
  revealed: boolean;
  leaderboardPlace: number | null;
};

type Player = { entityId: number; playerId: number; name: string | null };

type PendingEvent = { entityId: number; event: CardEvent["event"]; gameTurn: number };

const UNKNOWN_PLAYER = "UNKNOWN HUMAN PLAYER";

/** One game being read, from CREATE_GAME to STATE=COMPLETE. */
class GameBuilder {
  readonly startedAt: number;
  endedAt: number | null = null;
  gameType: string | null = null;
  formatType: string | null = null;
  gameTurn = 0;
  complete = false;
  /** Mulligan has begun: entities created from now on did not start in a deck. */
  setupOver = false;
  /** Opening hands are settled: deck → hand from now on is a draw. */
  mainStarted = false;

  readonly players = new Map<number, Player>();
  readonly entities = new Map<number, Entity>();
  friendlyPlayerId: number | null = null;
  firstPlayerEntity: number | null = null;
  readonly playstate = new Map<number, string>();
  concededEntity: number | null = null;
  /** The entity whose `tag=` lines follow (GameEntity is id 1). */
  current: number | null = null;

  readonly mulliganChoiceIds = new Map<string, number>();
  mulliganOptions: number[] = [];
  mulliganKept: number[] | null = null;
  /** The choice list the next `Entities[i]=` lines belong to. */
  choiceList: { kind: "options" | "kept"; friendly: boolean } | null = null;

  readonly pending: PendingEvent[] = [];

  constructor(startedAt: number) {
    this.startedAt = startedAt;
  }

  // ---- players and names (BattleTags stay in memory only) ----

  playerByPlayerId(playerId: number): Player | undefined {
    for (const p of this.players.values()) if (p.playerId === playerId) return p;
    return undefined;
  }

  /** Resolves a name to a player entity id; an unseen name belongs to the one player still without a name. */
  resolveName(name: string): number | null {
    if (name === "GameEntity") return 1;
    for (const p of this.players.values()) if (p.name === name) return p.entityId;
    const unnamed = [...this.players.values()].filter((p) => p.name === null);
    if (unnamed.length === 1 && unnamed[0]) {
      if (name !== UNKNOWN_PLAYER) unnamed[0].name = name;
      return unnamed[0].entityId;
    }
    return null;
  }

  resolve(ref: EntityRef): number | null {
    return "id" in ref ? ref.id : this.resolveName(ref.name);
  }

  entity(id: number): Entity {
    let e = this.entities.get(id);
    if (!e) {
      e = { id, controller: null, cardId: "", zone: null, cardType: null, cls: null, createdInSetup: false, firstZone: null, revealed: false, leaderboardPlace: null };
      this.entities.set(id, e);
    }
    return e;
  }

  // ---- tags ----

  setTag(id: number, tag: string, value: string) {
    if (id === 1) return this.setGameTag(tag, value);
    if (this.players.has(id)) return this.setPlayerTag(id, tag, value);
    const e = this.entity(id);
    switch (tag) {
      case "CONTROLLER":
        e.controller = Number(value);
        break;
      case "CARDTYPE":
        e.cardType = value;
        break;
      case "CLASS":
        e.cls = value;
        break;
      case "PLAYER_LEADERBOARD_PLACE":
        e.leaderboardPlace = Number(value) || null;
        break;
      case "ZONE":
        this.moveZone(e, value);
        break;
    }
  }

  private setGameTag(tag: string, value: string) {
    if (tag === "TURN") this.gameTurn = Number(value) || this.gameTurn;
    else if (tag === "STEP" && value === "BEGIN_MULLIGAN") this.setupOver = true;
    else if (tag === "STEP" && value === "MAIN_READY") {
      this.setupOver = true;
      this.mainStarted = true;
    } else if (tag === "STATE" && value === "COMPLETE") this.complete = true;
  }

  private setPlayerTag(id: number, tag: string, value: string) {
    if (tag === "FIRST_PLAYER" && value === "1") this.firstPlayerEntity = id;
    else if (tag === "PLAYSTATE") {
      if (value === "CONCEDED") this.concededEntity = id;
      if (value === "WON" || value === "LOST" || value === "TIED") this.playstate.set(id, value);
    }
  }

  private moveZone(e: Entity, to: string) {
    const from = e.zone;
    e.zone = to;
    if (from === null) {
      e.firstZone = to;
      return;
    }
    if (from === "DECK" && to === "HAND" && this.mainStarted) this.pending.push({ entityId: e.id, event: "DRAWN", gameTurn: this.gameTurn });
  }

  /** A card's identity became known (SHOW_ENTITY, or FULL_ENTITY with a CardID). */
  reveal(e: Entity, cardId: string, shown: boolean) {
    if (!cardId) return;
    if (!e.cardId) e.cardId = cardId;
    // Before the opening hands are settled, only our own hand is shown to us: that side is the friendly player.
    // Only SHOW_ENTITY counts: The Coin is created face up (FULL_ENTITY) for whoever goes second.
    if (shown && !this.mainStarted && this.friendlyPlayerId === null && e.zone === "HAND" && e.controller !== null) {
      this.friendlyPlayerId = e.controller;
    }
    if (!e.revealed) {
      e.revealed = true;
      this.pending.push({ entityId: e.id, event: "REVEALED", gameTurn: this.gameTurn });
    }
  }

  played(id: number) {
    this.pending.push({ entityId: id, event: "PLAYED", gameTurn: this.gameTurn });
  }
}

/** Started in a player's deck (or opening hand): only these count for card statistics, not generated cards. */
const fromDeck = (e: Entity | undefined): e is Entity => !!e && e.createdInSetup && (e.firstZone === "DECK" || e.firstZone === "HAND");

/**
 * Streaming Power.log parser. Feed it lines in order; it returns each game
 * as soon as the game is complete. Games cut off at the end of the file are
 * not returned (the watcher waits for more lines).
 */
export class PowerLogParser {
  private game: GameBuilder | null = null;
  private readonly clock: LogClock;
  readonly skipped: SkippedGame[] = [];

  constructor(private readonly opts: ParserOptions) {
    this.clock = new LogClock(opts.start, opts.timeZone);
  }

  /** True while a game has started but not finished (the watcher uses this). */
  get inGame(): boolean {
    return this.game !== null;
  }

  feed(line: string): GameRecord[] {
    const tok = tokenize(line);
    if (!tok) return [];
    const at = this.clock.at(tok.clock);
    const { method, body } = tok;

    if (method === "DebugPrintPower" && body === "CREATE_GAME") {
      // A game that never completed (disconnect, client closed) is dropped.
      this.game = new GameBuilder(at);
      return [];
    }
    const g = this.game;
    if (!g) return [];

    if (method === "DebugPrintPower") this.power(g, body);
    else this.closeEntity(g);
    if (method === "DebugPrintGame") this.gameInfo(g, body);
    else if (method === "DebugPrintEntityChoices") this.choices(g, body);
    else if (method === "DebugPrintEntitiesChosen") this.chosen(g, body);

    if (g.complete && g.endedAt === null) {
      g.endedAt = at;
      this.game = null;
      const record = this.finish(g);
      return record ? [record] : [];
    }
    return [];
  }

  /** A FULL/SHOW_ENTITY whose CardID is applied once its own tag lines (zone, controller) have been read. */
  private reveal: { id: number; cardId: string; shown: boolean } | null = null;

  /** Any line that is not a `tag=` line closes the previous entity's block. */
  private closeEntity(g: GameBuilder) {
    if (this.reveal) g.reveal(g.entity(this.reveal.id), this.reveal.cardId, this.reveal.shown);
    this.reveal = null;
    g.current = null;
  }

  private power(g: GameBuilder, body: string) {
    let m: RegExpExecArray | null;
    if ((m = /^tag=(\w+) value=(\S+)/.exec(body))) {
      if (g.current !== null && m[1] && m[2]) g.setTag(g.current, m[1], m[2]);
      return;
    }
    this.closeEntity(g);

    if ((m = /^GameEntity EntityID=(\d+)/.exec(body))) {
      g.current = Number(m[1]);
    } else if ((m = /^Player EntityID=(\d+) PlayerID=(\d+)/.exec(body))) {
      const entityId = Number(m[1]);
      g.players.set(entityId, { entityId, playerId: Number(m[2]), name: null });
      g.current = entityId;
    } else if ((m = /^FULL_ENTITY - Creating ID=(\d+) CardID=(\S*)/.exec(body))) {
      const e = g.entity(Number(m[1]));
      e.createdInSetup = !g.setupOver;
      g.current = e.id;
      if (m[2]) this.reveal = { id: e.id, cardId: m[2], shown: false };
    } else if ((m = /^(FULL_ENTITY|SHOW_ENTITY|CHANGE_ENTITY) - Updating (?:Entity=)?(.*) CardID=(\S*)$/.exec(body))) {
      const id = m[2] ? g.resolve(entityRef(m[2])) : null;
      g.current = id;
      // A transformed card (CHANGE_ENTITY) keeps counting as what it was; only its tags are read.
      if (id !== null && m[1] !== "CHANGE_ENTITY" && m[3]) this.reveal = { id, cardId: m[3], shown: m[1] === "SHOW_ENTITY" };
    } else if (body.startsWith("TAG_CHANGE ") || body.startsWith("HIDE_ENTITY ")) {
      const raw = entityField(body);
      const tag = /\btag=(\w+) value=(\S+)/.exec(body);
      const id = raw ? g.resolve(entityRef(raw)) : null;
      if (id !== null && tag?.[1] && tag[2]) g.setTag(id, tag[1], tag[2]);
    } else if (body.startsWith("BLOCK_START BlockType=PLAY ")) {
      const raw = entityField(body);
      const id = raw ? g.resolve(entityRef(raw)) : null;
      if (id !== null) g.played(id);
    }
  }

  private gameInfo(g: GameBuilder, body: string) {
    let m: RegExpExecArray | null;
    if ((m = /^GameType=(\w+)/.exec(body))) g.gameType = m[1] ?? null;
    else if ((m = /^FormatType=(\w+)/.exec(body))) g.formatType = m[1] ?? null;
    else if ((m = /^PlayerID=(\d+), PlayerName=(.+)$/.exec(body))) {
      const p = g.playerByPlayerId(Number(m[1]));
      const name = m[2]?.trim() ?? "";
      if (p && name && name !== UNKNOWN_PLAYER) p.name = name;
    }
  }

  private choices(g: GameBuilder, body: string) {
    const head = /^id=(\d+) Player=(.+?) TaskList=\S* ChoiceType=(\w+)/.exec(body);
    if (head) {
      const player = head[2] ? g.resolveName(head[2]) : null;
      const isMulligan = head[3] === "MULLIGAN";
      if (isMulligan && head[1] && player !== null) g.mulliganChoiceIds.set(head[1], player);
      g.choiceList = isMulligan && player !== null ? { kind: "options", friendly: this.isFriendlyPlayerEntity(g, player) } : null;
      if (g.choiceList?.friendly) g.mulliganOptions = [];
      return;
    }
    this.choiceEntity(g, body);
  }

  private chosen(g: GameBuilder, body: string) {
    const head = /^id=(\d+) Player=(.+?) EntitiesCount=\d+/.exec(body);
    if (head) {
      const player = head[1] ? g.mulliganChoiceIds.get(head[1]) : undefined;
      g.choiceList = player !== undefined ? { kind: "kept", friendly: this.isFriendlyPlayerEntity(g, player) } : null;
      if (g.choiceList?.friendly) g.mulliganKept = [];
      return;
    }
    this.choiceEntity(g, body);
  }

  private choiceEntity(g: GameBuilder, body: string) {
    const m = /^Entities\[\d+\]=(.*)$/.exec(body);
    const list = g.choiceList;
    if (!m?.[1] || !list?.friendly) return;
    const ref = entityRef(m[1]);
    if (!("id" in ref)) return;
    if (list.kind === "options") g.mulliganOptions.push(ref.id);
    else g.mulliganKept?.push(ref.id);
  }

  private isFriendlyPlayerEntity(g: GameBuilder, entityId: number): boolean {
    const p = g.players.get(entityId);
    return !!p && p.playerId === g.friendlyPlayerId;
  }

  // ---- building the record ----

  private finish(g: GameBuilder): GameRecord | null {
    const startedAt = new Date(g.startedAt).toISOString();
    const skip = (reason: string) => {
      this.skipped.push({ startedAt, reason });
      return null;
    };

    const mode = toMode(g.gameType);
    const friendlyId = g.friendlyPlayerId ?? this.friendlyFromNames(g);
    const friendly = friendlyId !== null ? g.playerByPlayerId(friendlyId) : undefined;
    if (!friendly) return skip("Could not tell which player was you.");
    const opponent = [...g.players.values()].find((p) => p.entityId !== friendly.entityId);

    const outcome = g.playstate.get(friendly.entityId);
    if (!outcome) return skip("The game has no result.");
    const result = outcome === "WON" ? "WIN" : outcome === "LOST" ? "LOSS" : "TIE";

    const myHero = this.hero(g, friendly.playerId);
    const theirHero = opponent ? this.hero(g, opponent.playerId) : undefined;
    const bg = isBattlegrounds(mode);
    if (!myHero || (!theirHero && !bg)) return skip("A hero is missing from the log.");

    const ended = g.endedAt ?? g.startedAt;
    const playerHeroCardId = myHero.cardId;
    const opponentHeroCardId = theirHero?.cardId ?? "";
    // The key leaves out the session name: an uploaded file may arrive without its folder, and the
    // watcher and an upload of the same log must agree. Start time to the second plus both heroes is unique.
    const sourceHash = createHash("sha256").update([startedAt.slice(0, 19), playerHeroCardId, opponentHeroCardId].join("|")).digest("hex");

    const record = {
      sourceHash,
      session: this.opts.session,
      startedAt,
      endedAt: new Date(ended).toISOString(),
      durationSec: Math.max(0, Math.round((ended - g.startedAt) / 1000)),
      mode,
      format: toFormat(g.formatType),
      gameType: g.gameType,
      formatType: g.formatType,
      result,
      conceded: g.concededEntity === null ? null : g.concededEntity === friendly.entityId ? "FRIENDLY" : "OPPOSING",
      playerClass: myHero.cls ?? "NEUTRAL",
      opponentClass: theirHero?.cls ?? "NEUTRAL",
      playerHeroCardId,
      opponentHeroCardId,
      wentFirst: bg || g.firstPlayerEntity === null ? null : g.firstPlayerEntity === friendly.entityId,
      turns: Math.ceil(g.gameTurn / 2),
      gameTurns: g.gameTurn,
      placement: bg ? myHero.leaderboardPlace : null,
      cardEvents: bg ? [] : this.cardEvents(g, friendly.playerId),
    } satisfies GameRecord;

    const parsed = gameRecordSchema.safeParse(record);
    return parsed.success ? parsed.data : skip("The game record did not pass validation.");
  }

  /**
   * Fallback when no hand was revealed: the log names only the local player
   * (opponents show as UNKNOWN HUMAN PLAYER; in Battlegrounds the other "player" is the Innkeeper).
   */
  private friendlyFromNames(g: GameBuilder): number | null {
    const named = [...g.players.values()].filter((p) => p.name !== null);
    const tagged = named.filter((p) => /#\d+$/.test(p.name ?? ""));
    const pick = named.length === 1 ? named : tagged.length === 1 ? tagged : [];
    return pick[0]?.playerId ?? null;
  }

  /** The hero a player started with (later hero cards, such as a played hero, don't change the class). */
  private hero(g: GameBuilder, playerId: number): Entity | undefined {
    let found: Entity | undefined;
    for (const e of g.entities.values()) {
      if (e.cardType === "HERO" && e.controller === playerId && e.cardId && (!found || e.id < found.id)) found = e;
    }
    return found;
  }

  private cardEvents(g: GameBuilder, friendlyId: number): CardEvent[] {
    const events: CardEvent[] = [];
    const side = (e: Entity) => (e.controller === friendlyId ? "FRIENDLY" : "OPPOSING");
    const turnOf = (gameTurn: number) => Math.max(1, Math.ceil(gameTurn / 2));

    // Mulligan: every offered card that started in our deck, kept or sent back.
    const kept = new Set(g.mulliganKept ?? []);
    for (const id of g.mulliganOptions) {
      const e = g.entities.get(id);
      const dbfId = fromDeck(e) ? this.opts.dbfOf(e.cardId) : undefined;
      if (dbfId) events.push({ side: "FRIENDLY", dbfId, event: kept.has(id) ? "MULLIGAN_KEPT" : "MULLIGAN_REPLACED", turn: 0 });
    }

    for (const p of g.pending) {
      const e = g.entities.get(p.entityId);
      if (!fromDeck(e) || e.controller === null) continue;
      const dbfId = this.opts.dbfOf(e.cardId);
      if (!dbfId) continue;
      const s = side(e);
      // Draws are only known for our side; our own cards are not "revealed" to us.
      if (p.event === "DRAWN" && s !== "FRIENDLY") continue;
      if (p.event === "REVEALED" && s !== "OPPOSING") continue;
      events.push({ side: s, dbfId, event: p.event, turn: turnOf(p.gameTurn) });
    }
    return events;
  }
}
