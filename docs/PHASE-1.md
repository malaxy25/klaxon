# Klaxon — Engine & Server (Phase 1+)

Die host-agnostische Spiel-Engine in `shared` und der Colyseus-Adapter im Server.
Vollstaendige Dateien mit Pfad - so sehen sie am Ende aus.

> Verifiziert in einer Node-22-Sandbox: `tsc` baut `shared` und `server` sauber;
> die Engine wurde deterministisch simuliert (Invarianten, 1/6-Zielverteilung,
> Level-Up, Ablauf, Game Over, Stats-Zuordnung) und der Room ueber zwei echte
> `@colyseus/sdk`-Clients getestet (Lobby, State-Sync, setName, setDifficulty,
> playAgain, Stats-Sync, Feedback-Ack). Auf Windows BOM-frei (`Write-NoBom`) + ASCII
> schreiben - siehe M0b in `GETTING-STARTED.md`.

## Prinzip

Die gesamte Spiellogik liegt als reine `SpaceteamGame`-Engine in `shared` (kein
Netzwerk, deterministisch testbar). Der `SpaceteamRoom` ist ein duenner Adapter:
Messages rein -> Engine -> Engine-State in Colyseus-Schema spiegeln -> Sync. Timer via
`this.clock`. Nachrichten: `setName`, `ready`, `start`, `playAgain`, `setControl`,
`setDifficulty`, `feedback`.

## Dateibaum

```
packages/shared/src/   types.ts rng.ts technobabble.ts difficulty.ts
                       panel.ts instructions.ts engine.ts index.ts
packages/server/src/   main.ts  rooms/SpaceteamRoom.ts  (+ rooms/MyRoom.ts, MyState.ts aus dem Scaffold)
```

---

# Vollstaendige Dateien

## Datei: `spaceteam/packages/shared/src/types.ts`

```ts
export type ControlType = "button" | "toggle" | "slider" | "selector";

export interface Control {
  id: string;
  type: ControlType;
  label: string;        // Technobabble, z. B. "Fluxcapacitor"
  value: string;        // vereinheitlicht als String: "" | "true"/"false" | "0".."max" | Option
  min?: number;         // slider
  max?: number;         // slider
  options?: string[];   // selector
  w?: number;           // Grid-Breite in Zellen (Panel-Layout)
  h?: number;           // Grid-Hoehe in Zellen (Panel-Layout)
  ownerId: string;      // Spieler, dem das Control gehört
}

export interface Instruction {
  id: string;
  sourceId: string;         // Spieler, der den Befehl SIEHT
  targetControlId: string;  // Control, das verändert werden muss (irgendwo)
  targetValue: string;      // Zielwert ("" bei button)
  text: string;             // angezeigter Befehlstext
  deadline: number;         // ms-Zeitstempel, bis wann
}

export type Phase = "lobby" | "playing" | "over";

export interface Difficulty {
  instructionTimeMs: number;      // Zeit pro Befehl
  healthDrainPerSec: number;      // passiver Aderlass
  deathLimitRisePerSec: number;   // Anstieg der Todesgrenze
  completedHealthGain: number;    // Heilung pro erfülltem Befehl
  expiredHealthLoss: number;      // Schaden pro abgelaufenem Befehl
}

export interface GameEvent {
  type: "completed" | "expired" | "nextLevel" | "gameOver";
  playerId?: string;
}
```

## Datei: `spaceteam/packages/shared/src/rng.ts`

```ts
// Seedbarer PRNG (mulberry32) — erlaubt deterministische Tests.
// In Produktion wird einfach Math.random genutzt.
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function randInt(min: number, max: number, rng: Rng): number {
  // inklusive min..max
  return min + Math.floor(rng() * (max - min + 1));
}
```

## Datei: `spaceteam/packages/shared/src/technobabble.ts`

```ts
import { Rng, pick } from "./rng";

const PREFIXES = ["Flux", "Techno", "Cryo", "Quantum", "Plasma", "Neutrino", "Hydro", "Astro", "Gyro", "Photon", "Ion", "Warp"];
const NOUNS = ["capacitor", "beam", "matrix", "coupling", "injector", "manifold", "dampener", "array", "reactor", "thruster", "conduit", "modulator"];
const ADJECTIVES = ["auxiliary", "primary", "reverse", "lateral", "inverted", "cardinal", "spectral", "dorsal"];
const ACTIONS = ["reboot", "purge", "align", "vent", "prime", "sync", "calibrate", "reroute"];

export function makeControlLabel(rng: Rng): string {
  if (rng() < 0.34) return `${pick(ADJECTIVES, rng)} ${pick(NOUNS, rng)}`;
  return `${pick(PREFIXES, rng)}${pick(NOUNS, rng)}`;
}

export function makeSelectorOptions(rng: Rng, n: number): string[] {
  const shuffled = [...ACTIONS].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

// nur für den freistehenden Demo-Export
export function randomTechnobabble(rng: Rng = Math.random): string {
  return makeControlLabel(rng);
}
```

## Datei: `spaceteam/packages/shared/src/difficulty.ts`

```ts
import { Difficulty } from "./types";

// Basiswerte & Rampe adaptiert von OpenSpaceTeam (in ms/Sekunden umgerechnet),
// eigene Neuimplementierung.
export const BASE_DIFFICULTY: Difficulty = {
  instructionTimeMs: 25000,
  healthDrainPerSec: 0.5,
  deathLimitRisePerSec: 0.05,
  completedHealthGain: 10,
  expiredHealthLoss: 5,
};

export const STARTING_HEALTH = 50;
export const MAX_HEALTH = 100;
export const MAX_DEATH_LIMIT = 90;

// Verschärft die Schwierigkeit für ein gegebenes Level (level >= 1).
export function difficultyForLevel(level: number): Difficulty {
  const d: Difficulty = { ...BASE_DIFFICULTY };
  for (let l = 1; l < level; l++) {
    d.instructionTimeMs = Math.max(7000, d.instructionTimeMs - 1250);
    d.healthDrainPerSec = Math.min(1.25, d.healthDrainPerSec + 0.35);
    d.deathLimitRisePerSec = Math.min(1.25, d.deathLimitRisePerSec + 0.15);
    d.completedHealthGain = Math.max(3, d.completedHealthGain - 0.5);
    d.expiredHealthLoss = Math.min(11.5, d.expiredHealthLoss + 0.25);
  }
  return d;
}

// Panelgröße wächst mit dem Level (analog zu volleren Grids).
export function panelSizeForLevel(level: number): number {
  return Math.min(10, 5 + level);
}
```

## Datei: `spaceteam/packages/shared/src/panel.ts`

```ts
import { Control, ControlType } from "./types";
import { Rng, pick, randInt } from "./rng";
import { makeControlLabel, makeSelectorOptions } from "./technobabble";

const TYPES: ControlType[] = ["button", "toggle", "slider", "selector"];

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter}`;
}

export function makeControl(ownerId: string, rng: Rng): Control {
  const type = pick(TYPES, rng);
  const base: Control = {
    id: nextId("ctl"),
    type,
    label: makeControlLabel(rng),
    value: "",
    ownerId,
  };
  if (type === "toggle") {
    base.value = rng() < 0.5 ? "true" : "false";
  } else if (type === "slider") {
    base.min = 0;
    base.max = randInt(3, 6, rng);
    base.value = String(randInt(base.min, base.max, rng));
  } else if (type === "selector") {
    base.options = makeSelectorOptions(rng, randInt(2, 4, rng));
    base.value = pick(base.options, rng);
  }
  // Footprint fuers Panel-Layout (dichtes Raster im Client)
  if (type === "slider") { base.w = 2; base.h = rng() < 0.25 ? 2 : 1; }
  else if (type === "selector") { base.w = (base.options?.length ?? 0) >= 3 ? 2 : 1; base.h = 1; }
  else { base.w = 1; base.h = 1; }

  return base;
}

export function generatePanel(ownerId: string, size: number, rng: Rng): Control[] {
  const controls: Control[] = [];
  const usedLabels = new Set<string>();
  while (controls.length < size) {
    const c = makeControl(ownerId, rng);
    if (usedLabels.has(c.label)) continue; // eindeutige Labels pro Panel
    usedLabels.add(c.label);
    controls.push(c);
  }
  return controls;
}
```

## Datei: `spaceteam/packages/shared/src/instructions.ts`

```ts
import { Control, Instruction } from "./types";
import { Rng, pick, randInt } from "./rng";

let counter = 0;
function nextId(): string {
  counter += 1;
  return `ins_${counter}`;
}

// Kann für dieses Control überhaupt ein Zielwert != aktuell erzeugt werden?
export function canTarget(c: Control): boolean {
  switch (c.type) {
    case "button": return true;
    case "toggle": return true;
    case "slider": return (c.max ?? 0) > (c.min ?? 0);
    case "selector": return (c.options?.length ?? 0) > 1;
  }
}

// Zielwert bestimmen — immer != aktueller Wert (sonst wäre der Befehl schon erfüllt).
export function pickTargetValue(c: Control, rng: Rng): string {
  switch (c.type) {
    case "button":
      return "";
    case "toggle":
      return c.value === "true" ? "false" : "true";
    case "slider": {
      const min = c.min ?? 0;
      const max = c.max ?? 0;
      const cur = Number(c.value);
      let v = cur;
      while (v === cur) v = randInt(min, max, rng);
      return String(v);
    }
    case "selector": {
      const opts = c.options ?? [];
      let v = c.value;
      while (v === c.value) v = pick(opts, rng);
      return v;
    }
  }
}

export function instructionText(c: Control, targetValue: string): string {
  switch (c.type) {
    case "button":
      return pick([`Press ${c.label}`, `Engage ${c.label}`, `Trigger ${c.label}`], rng0);
    case "toggle":
      return targetValue === "true"
        ? pick([`Engage ${c.label}`, `Activate ${c.label}`, `Switch on ${c.label}`], rng0)
        : pick([`Disengage ${c.label}`, `Deactivate ${c.label}`, `Switch off ${c.label}`], rng0);
    case "slider": {
      const cur = Number(c.value);
      const v = Number(targetValue);
      const opts: string[] = [`Set ${c.label} to ${v}`, `Dial ${c.label} to ${v}`];
      if (v === (c.max ?? v)) opts.push(`Set ${c.label} to max`, `Max out ${c.label}`);
      else if (v === (c.min ?? v)) opts.push(`Set ${c.label} to min`, `Zero out ${c.label}`);
      else if (v > cur) opts.push(`Increase ${c.label} to ${v}`);
      else opts.push(`Decrease ${c.label} to ${v}`, `Reduce ${c.label} to ${v}`);
      return pick(opts, rng0);
    }
    case "selector":
      return pick([`Set ${c.label} to ${targetValue}`, `Switch ${c.label} to ${targetValue}`], rng0);
  }
}

// Textvarianten nutzen etwas Zufall; wird beim Erzeugen mit echtem rng gesetzt.
let rng0: Rng = Math.random;
export function setTextRng(rng: Rng): void { rng0 = rng; }

export function makeInstruction(
  sourceId: string,
  target: Control,
  rng: Rng,
  deadline: number
): Instruction {
  setTextRng(rng);
  const targetValue = pickTargetValue(target, rng);
  return {
    id: nextId(),
    sourceId,
    targetControlId: target.id,
    targetValue,
    text: instructionText(target, targetValue),
    deadline,
  };
}

// Erfüllt eine Control-Änderung diesen Befehl?
export function satisfies(ins: Instruction, control: Control, newValue: string): boolean {
  if (ins.targetControlId !== control.id) return false;
  if (control.type === "button") return true; // jeder Druck erfüllt
  return ins.targetValue === newValue;
}
```

## Datei: `spaceteam/packages/shared/src/engine.ts`

```ts
import { Control, Instruction, Phase, Difficulty, GameEvent } from "./types";
import { Rng, pick } from "./rng";
import { generatePanel } from "./panel";
import { makeInstruction, satisfies, canTarget } from "./instructions";
import {
  difficultyForLevel, panelSizeForLevel,
  STARTING_HEALTH, MAX_HEALTH, MAX_DEATH_LIMIT,
} from "./difficulty";

export interface EnginePlayer {
  id: string;
  name: string;
  connected: boolean;
  host: boolean;
  ready: boolean;
  panel: Control[];
  instruction: Instruction | null;
  statCompleted: number; // vom Spieler ausgefuehrte Befehle
  statExpired: number;   // eigene Befehle, die abliefen
}

export interface EngineOptions {
  rng?: Rng;
  now?: () => number;
  singlePlayer?: boolean; // Start mit nur 1 Spieler erlauben (Debug/Test)
}

export interface ChangeResult {
  completed: boolean;
  events: GameEvent[];
}

export class SpaceteamGame {
  phase: Phase = "lobby";
  level = 0;
  startLevel = 3; // gewaehlte Schwierigkeit = Start-Sektor
  health = STARTING_HEALTH;
  deathLimit = 0;
  difficulty: Difficulty = difficultyForLevel(1);
  players = new Map<string, EnginePlayer>();

  private rng: Rng;
  private now: () => number;
  private singlePlayer: boolean;
  private lastTick: number;

  constructor(opts: EngineOptions = {}) {
    this.rng = opts.rng ?? Math.random;
    this.now = opts.now ?? (() => Date.now());
    this.singlePlayer = opts.singlePlayer ?? false;
    this.lastTick = this.now();
  }

  // ---------- Lobby ----------
  addPlayer(id: string, name: string): void {
    if (this.players.has(id)) return;
    this.players.set(id, {
      id, name, connected: true,
      host: this.players.size === 0,
      ready: false, panel: [], instruction: null,
      statCompleted: 0, statExpired: 0,
    });
  }

  removePlayer(id: string): GameEvent[] {
    const wasHost = this.players.get(id)?.host ?? false;
    this.players.delete(id);
    if (this.phase === "playing") {
      // Wie OpenSpaceTeam: Disconnect im Spiel beendet die Runde.
      this.phase = "over";
      return [{ type: "gameOver" }];
    }
    if (wasHost && this.players.size > 0) {
      const next = pick([...this.players.values()], this.rng);
      next.host = true;
    }
    return [];
  }

  setReady(id: string, ready: boolean): void {
    const p = this.players.get(id);
    if (p) p.ready = ready;
  }

  setStartLevel(n: number): void {
    this.startLevel = Math.max(1, Math.min(20, Math.floor(n || 1)));
  }

  canStart(): boolean {
    const n = this.players.size;
    if (this.singlePlayer) return n >= 1;
    return n >= 2 && [...this.players.values()].every((p) => p.ready);
  }

  // ---------- Spielstart / Level ----------
  start(): boolean {
    if (this.phase !== "lobby" || !this.canStart()) return false;
    this.phase = "playing";
    this.level = this.startLevel;
    this.difficulty = difficultyForLevel(this.level);
    this.health = STARTING_HEALTH;
    this.deathLimit = 0;
    for (const p of this.players.values()) { p.statCompleted = 0; p.statExpired = 0; }
    this.assignPanels();
    this.assignInstructions();
    this.lastTick = this.now();
    return true;
  }

  // Nach Game Over zurueck in die Lobby (Spieler + Ready-Flags bleiben erhalten).
  backToLobby(): boolean {
    if (this.phase !== "over") return false;
    this.phase = "lobby";
    this.level = 0;
    this.health = STARTING_HEALTH;
    this.deathLimit = 0;
    for (const p of this.players.values()) {
      p.panel = [];
      p.instruction = null;
    }
    return true;
  }

  private assignPanels(): void {
    const size = panelSizeForLevel(this.level);
    for (const p of this.players.values()) {
      p.panel = generatePanel(p.id, size, this.rng);
      p.instruction = null;
    }
  }

  private assignInstructions(): void {
    for (const p of this.players.values()) this.generateInstructionFor(p);
  }

  private nextLevel(): GameEvent {
    this.level += 1;
    this.difficulty = difficultyForLevel(this.level);
    this.health = STARTING_HEALTH;
    this.deathLimit = 0;
    this.assignPanels();
    this.assignInstructions();
    this.lastTick = this.now();
    return { type: "nextLevel" };
  }

  // ---------- Instruktionsgenerierung ----------
  private takenControlIds(): Set<string> {
    const s = new Set<string>();
    for (const p of this.players.values()) {
      if (p.instruction) s.add(p.instruction.targetControlId);
    }
    return s;
  }

  private allControls(): Control[] {
    const all: Control[] = [];
    for (const p of this.players.values()) all.push(...p.panel);
    return all;
  }

  private pickTargetPlayer(source: EnginePlayer): EnginePlayer {
    const others = [...this.players.values()].filter((p) => p.id !== source.id);
    // 1/6 Eigenanteil (wie OpenSpaceTeam); ohne Mitspieler zwangsläufig selbst.
    if (others.length === 0 || this.rng() < 1 / 6) return source;
    return pick(others, this.rng);
  }

  private generateInstructionFor(player: EnginePlayer): void {
    player.instruction = null; // erst freigeben, dann Kollisionen berechnen
    const taken = this.takenControlIds();
    const target = this.pickTargetPlayer(player);

    const untakenPreferred = target.panel.filter((c) => canTarget(c) && !taken.has(c.id));
    let pool = untakenPreferred;
    if (pool.length === 0) pool = this.allControls().filter((c) => canTarget(c) && !taken.has(c.id));
    if (pool.length === 0) pool = this.allControls().filter((c) => canTarget(c)); // Notnagel

    const control = pick(pool, this.rng);
    const deadline = this.now() + this.difficulty.instructionTimeMs;
    player.instruction = makeInstruction(player.id, control, this.rng, deadline);
  }

  private findControl(id: string): Control | undefined {
    for (const p of this.players.values()) {
      const c = p.panel.find((x) => x.id === id);
      if (c) return c;
    }
    return undefined;
  }

  // ---------- Eingabe eines Spielers ----------
  handleControlChange(playerId: string, controlId: string, value: string): ChangeResult {
    const events: GameEvent[] = [];
    if (this.phase !== "playing") return { completed: false, events };
    const player = this.players.get(playerId);
    if (!player) return { completed: false, events };
    const control = player.panel.find((c) => c.id === controlId);
    if (!control) return { completed: false, events };

    // Wert übernehmen (Button hält keinen Wert)
    if (control.type !== "button") control.value = value;

    // Erfüllt die Änderung irgendeinen aktiven Befehl?
    for (const p of this.players.values()) {
      const ins = p.instruction;
      if (ins && satisfies(ins, control, value)) {
        player.statCompleted++;
        this.health = Math.min(MAX_HEALTH, this.health + this.difficulty.completedHealthGain);
        events.push({ type: "completed", playerId: p.id });
        if (this.health >= MAX_HEALTH) {
          events.push(this.nextLevel());
        } else {
          this.generateInstructionFor(p);
        }
        return { completed: true, events };
      }
    }
    return { completed: false, events };
  }

  // ---------- Zeitschritt: Aderlass + Ablauf ----------
  tick(nowMs?: number): GameEvent[] {
    const events: GameEvent[] = [];
    if (this.phase !== "playing") return events;
    const now = nowMs ?? this.now();
    const dt = Math.max(0, (now - this.lastTick) / 1000);
    this.lastTick = now;

    this.health -= this.difficulty.healthDrainPerSec * dt;
    this.deathLimit = Math.min(MAX_DEATH_LIMIT, this.deathLimit + this.difficulty.deathLimitRisePerSec * dt);

    // Abgelaufene Befehle
    for (const p of this.players.values()) {
      const ins = p.instruction;
      if (ins && now >= ins.deadline) {
        p.statExpired++;
        this.health -= this.difficulty.expiredHealthLoss;
        events.push({ type: "expired", playerId: p.id });
        this.generateInstructionFor(p);
      }
    }

    if (this.health <= this.deathLimit) {
      this.phase = "over";
      events.push({ type: "gameOver" });
    }
    return events;
  }
}
```

## Datei: `spaceteam/packages/shared/src/index.ts`

```ts
export * from "./types";
export * from "./rng";
export * from "./technobabble";
export * from "./difficulty";
export * from "./panel";
export * from "./instructions";
export * from "./engine";
```

## Datei: `spaceteam/packages/server/src/rooms/SpaceteamRoom.ts`

```ts
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
  @type("number") statCompleted = 0;
  @type("number") statExpired = 0;
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
        fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: line, text: line }) })
          .catch((e) => console.error("feedback webhook failed:", e));
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
```

## Datei: `spaceteam/packages/server/src/main.ts`

```ts
import { defineServer, defineRoom } from "colyseus";
import { MyRoom } from "./rooms/MyRoom";
import { SpaceteamRoom } from "./rooms/SpaceteamRoom";
import { randomTechnobabble } from "@spaceteam/shared";

const port = parseInt(process.env.PORT, 10) || 2567;

const server = defineServer({
  rooms: {
    my_room: defineRoom(MyRoom),
    spaceteam: defineRoom(SpaceteamRoom),
  },
});

server.listen(port);
console.log(`Colyseus lauscht auf ws://localhost:${port} (shared: ${randomTechnobabble()})`);
```

