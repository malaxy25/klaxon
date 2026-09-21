import { Room, Client } from "colyseus";
import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import { SpaceteamGame, GameEvent } from "@spaceteam/shared";

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
  // nur mit DEBUG_TARGETS=1 befüllt (für automatisierte Tests):
  @type("string") dbgTargetControlId = "";
  @type("string") dbgTargetValue = "";
}

class GameState extends Schema {
  @type("string") phase = "lobby";
  @type("number") level = 0;
  @type("number") health = 50;
  @type("number") deathLimit = 0;
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
}

export class SpaceteamRoom extends Room {
  state = new GameState();
  maxClients = 4;
  private game!: SpaceteamGame;
  private debug = process.env.DEBUG_TARGETS === "1";

  onCreate() {
    this.game = new SpaceteamGame({ singlePlayer: process.env.SINGLE_PLAYER === "1" });

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
      if (p?.host && this.game.start()) this.syncFull();
    });
    this.onMessage("playAgain", (client) => {
      const p = this.game.players.get(client.sessionId);
      if (p?.host && this.game.backToLobby()) this.syncFull();
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
          cs.w = c.w ?? 1; cs.h = c.h ?? 1;
          cs.options = new ArraySchema<string>(...(c.options ?? []));
          sp.panel.push(cs);
        }
      } else {
        // nur Werte aktualisieren
        for (let i = 0; i < ep.panel.length; i++) sp.panel[i].value = ep.panel[i].value;
      }
    }
  }
}
