import { Room, Client } from "colyseus";
import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import { SpaceteamGame, GameEvent } from "@spaceteam/shared";

function genCode(): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

class ControlSchema extends Schema {
  @type("string") id = "";
  @type("string") kind = "";
  @type("string") label = "";
  @type("string") value = "";
  @type("number") min = 0;
  @type("number") max = 0;
  @type(["string"]) options = new ArraySchema<string>();
  @type("number") w = 1;
  @type("number") h = 1;
  @type("boolean") broken = false;
  @type("string") ownerId = "";
}

class PlayerSchema extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("boolean") connected = true;
  @type("boolean") host = false;
  @type("boolean") ready = false;
  @type([ControlSchema]) panel = new ArraySchema<ControlSchema>();
  @type("string") instructionText = "";
  @type("number") statCompleted = 0;
  @type("number") statExpired = 0;
  @type("boolean") eventDone = false;
  // nur mit DEBUG_TARGETS=1 befüllt (für automatisierte Tests):
  @type("string") dbgTargetControlId = "";
  @type("string") dbgTargetValue = "";
}

class GameState extends Schema {
  @type("string") phase = "lobby";
  @type("number") level = 0;
  @type("number") health = 50;
  @type("number") deathLimit = 0;
  @type("number") startLevel = 3;
  @type("string") code = "";
  @type("string") eventType = "";
  @type("number") eventMs = 0;
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
}

export class SpaceteamRoom extends Room {
  state = new GameState();
  maxClients = 4;
  private game!: SpaceteamGame;
  private debug = process.env.DEBUG_TARGETS === "1";

  onCreate(options: any) {
    this.game = new SpaceteamGame({ singlePlayer: process.env.SINGLE_PLAYER === "1" });
    const code = String(options?.code || genCode()).toUpperCase().slice(0, 6);
    this.setMetadata({ code });
    this.state.code = code;

    this.onMessage("setName", (client, name: string) => {
      const p = this.game.players.get(client.sessionId);
      if (p) p.name = String(name ?? "").slice(0, 20) || p.name;
      this.syncFull();
    });
    this.onMessage("ready", (client, ready: boolean) => {
      this.game.setReady(client.sessionId, !!ready);
      this.syncFull();
    });
    this.onMessage("start", (client) => {
      const p = this.game.players.get(client.sessionId);
      if (p?.host && this.game.start()) { this.lock(); this.syncFull(); }
    });
    this.onMessage("playAgain", (client) => {
      const p = this.game.players.get(client.sessionId);
      if (p?.host && this.game.backToLobby()) { this.unlock(); this.syncFull(); }
    });
    this.onMessage("repairControl", (client, controlId: string) => {
      const events = this.game.repair(client.sessionId, String(controlId));
      if (events.length) { events.forEach((e) => this.emitEvent(e)); this.syncFull(); }
    });
    this.onMessage("eventAction", (client) => {
      const events = this.game.markEventDone(client.sessionId);
      events.forEach((e) => this.emitEvent(e));
      this.syncFull();
    });
    this.onMessage("setDifficulty", (client, level: number) => {
      const p = this.game.players.get(client.sessionId);
      if (p?.host && this.game.phase === "lobby") { this.game.setStartLevel(Number(level)); this.syncFull(); }
    });
    this.onMessage("feedback", (client, text: string) => {
      const p = this.game.players.get(client.sessionId);
      const clean = String(text ?? "").slice(0, 500).trim();
      if (!clean) return;
      const line = `[Klaxon] ${p?.name || "?"} (sector ${this.game.level}, diff ${this.game.startLevel}): ${clean}`;
      console.log("FEEDBACK", line);
      const hook = process.env.FEEDBACK_WEBHOOK;
      if (hook) {
        // ntfy.sh will reinen Text; Discord/Slack/Apps-Script koennen JSON.
        const isText = /ntfy\.sh/i.test(hook);
        const init = isText
          ? { method: "POST", headers: { "Content-Type": "text/plain" }, body: line }
          : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: line, text: line }) };
        fetch(hook, init).catch((e) => console.error("feedback webhook failed:", e));
      }
      client.send("feedbackAck", true);
    });
    this.onMessage("setControl", (client, m: { controlId: string; value: string }) => {
      const res = this.game.handleControlChange(client.sessionId, m?.controlId, String(m?.value ?? ""));
      res.events.forEach((e) => this.emitEvent(e));
      this.syncFull();
    });

    // Zeitschritt: Drain/Ablauf
    this.clock.setInterval(() => {
      const events = this.game.tick();
      if (events.length) {
        events.forEach((e) => this.emitEvent(e));
        this.syncFull();
      } else {
        this.syncDynamic();
      }
    }, 250);
  }

  onJoin(client: Client) {
    this.game.addPlayer(client.sessionId, "Player");
    this.syncFull();
  }

  onLeave(client: Client) {
    const events = this.game.removePlayer(client.sessionId);
    events.forEach((e) => this.emitEvent(e));
    this.syncFull();
  }

  private emitEvent(e: GameEvent) {
    this.broadcast("evt", e);
  }

  private syncDynamic() {
    this.state.phase = this.game.phase;
    this.state.level = this.game.level;
    this.state.health = Math.round(this.game.health);
    this.state.deathLimit = Math.round(this.game.deathLimit);
    this.state.startLevel = this.game.startLevel;
    this.state.eventType = this.game.event?.type ?? "";
    this.state.eventMs = this.game.event ? 6000 : 0;
  }

  private syncFull() {
    this.syncDynamic();
    // Spieler entfernen, die nicht mehr existieren
    for (const id of [...this.state.players.keys()]) {
      if (!this.game.players.has(id)) this.state.players.delete(id);
    }
    for (const ep of this.game.players.values()) {
      let sp = this.state.players.get(ep.id);
      if (!sp) { sp = new PlayerSchema(); sp.id = ep.id; this.state.players.set(ep.id, sp); }
      sp.name = ep.name;
      sp.connected = ep.connected;
      sp.host = ep.host;
      sp.ready = ep.ready;
      sp.instructionText = ep.instruction?.text ?? "";
      sp.statCompleted = ep.statCompleted;
      sp.statExpired = ep.statExpired;
      sp.eventDone = this.game.event ? this.game.event.done.has(ep.id) : false;
      sp.dbgTargetControlId = this.debug ? (ep.instruction?.targetControlId ?? "") : "";
      sp.dbgTargetValue = this.debug ? (ep.instruction?.targetValue ?? "") : "";

      // Panel nur neu aufbauen, wenn es sich geändert hat (Start/Level-Up)
      const changed = sp.panel.length !== ep.panel.length ||
        (ep.panel[0] && sp.panel[0] && sp.panel[0].id !== ep.panel[0].id);
      if (changed) {
        sp.panel.clear();
        for (const c of ep.panel) {
          const cs = new ControlSchema();
          cs.id = c.id; cs.kind = c.type; cs.label = c.label; cs.value = c.value;
          cs.min = c.min ?? 0; cs.max = c.max ?? 0; cs.ownerId = c.ownerId;
          cs.w = c.w ?? 1; cs.h = c.h ?? 1; cs.broken = c.broken ?? false;
          cs.options = new ArraySchema<string>(...(c.options ?? []));
          sp.panel.push(cs);
        }
      } else {
        // nur Werte aktualisieren
        for (let i = 0; i < ep.panel.length; i++) { sp.panel[i].value = ep.panel[i].value; sp.panel[i].broken = ep.panel[i].broken ?? false; }
      }
    }
  }
}
