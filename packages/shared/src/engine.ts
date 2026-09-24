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
  maxTiles: number;      // Kachel-Obergrenze je nach Geraet (4..6)
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
  private nextBreakAt = 0;
  event: { type: string; endsAt: number; done: Set<string> } | null = null;
  paused = false;
  private nextEventAt = 0;
  forceEvent = "";
  private readonly EVENT_MS = 6000;

  constructor(opts: EngineOptions = {}) {
    this.rng = opts.rng ?? Math.random;
    this.now = opts.now ?? (() => Date.now());
    this.singlePlayer = opts.singlePlayer ?? false;
    this.lastTick = this.now();
  }

  // ---------- Lobby ----------
  addPlayer(id: string, name: string, maxTiles = 6): void {
    if (this.players.has(id)) return;
    this.players.set(id, {
      id, name, connected: true,
      host: this.players.size === 0,
      ready: false, panel: [], instruction: null,
      statCompleted: 0, statExpired: 0,
      maxTiles: Math.max(4, Math.min(6, Math.round(maxTiles) || 6)),
    });
  }

  removePlayer(id: string): GameEvent[] {
    const wasHost = this.players.get(id)?.host ?? false;
    this.players.delete(id);
    if (wasHost && this.players.size > 0) {
      const next = pick([...this.players.values()], this.rng);
      next.host = true;
    }
    // Im Spiel nur beenden, wenn zu wenige uebrig sind.
    if (this.phase === "playing" && this.players.size < 2) {
      this.phase = "over";
      return [{ type: "gameOver" }];
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
  start(force = false): boolean {
    if (this.phase !== "lobby") return false;
    if (!force && !this.canStart()) return false;
    if (this.players.size < 1) return false;
    this.phase = "playing";
    this.level = this.startLevel;
    this.difficulty = difficultyForLevel(this.level);
    this.health = STARTING_HEALTH;
    this.deathLimit = 0;
    for (const p of this.players.values()) { p.statCompleted = 0; p.statExpired = 0; }
    this.assignPanels();
    this.assignInstructions();
    this.lastTick = this.now();
    this.nextBreakAt = this.now() + this.breakInterval();
    this.event = null;
    this.nextEventAt = this.now() + 18000;
    return true;
  }

  // Nach Game Over zurueck in die Lobby (Spieler + Ready-Flags bleiben erhalten).
  backToLobby(): boolean {
    if (this.phase !== "over") return false;
    this.phase = "lobby";
    this.level = 0;
    this.health = STARTING_HEALTH;
    this.deathLimit = 0;
    this.event = null;
    for (const p of this.players.values()) {
      p.panel = [];
      p.instruction = null;
    }
    return true;
  }

  private assignPanels(): void {
    const base = panelSizeForLevel(this.level);
    for (const p of this.players.values()) {
      const size = Math.max(4, Math.min(base, p.maxTiles ?? 6));
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
  private eventInterval(): number { return 28000; }

  // Wurmloch: Panels dauerhaft zwischen Spielern rotieren (2 Spieler = Tausch).
  private rotatePanels(): void {
    const ids = [...this.players.keys()];
    if (ids.length < 2) return;
    const panels = ids.map((id) => this.players.get(id)!.panel);
    for (let i = 0; i < ids.length; i++) {
      const p = this.players.get(ids[i])!;
      const newPanel = panels[(i + 1) % ids.length];
      p.panel = newPanel;
      for (const c of newPanel) c.ownerId = p.id;
    }
  }

  private startEvent(): GameEvent {
    const types = ["meteor", "blackhole", "brace", "surge", "freeze", "wormhole"];
    const type = this.forceEvent || pick(types, this.rng);
    if (type === "wormhole") this.rotatePanels();
    this.event = { type, endsAt: this.now() + this.EVENT_MS, done: new Set() };
    return { type: "eventStart" };
  }

  markEventDone(playerId: string): GameEvent[] {
    const events: GameEvent[] = [];
    if (!this.event || !this.players.has(playerId)) return events;
    if (this.event.type === "freeze") {
      this.event = null;
      this.health -= 15;
      this.nextEventAt = this.now() + this.eventInterval();
      events.push({ type: "eventFailed" });
      return events;
    }
    this.event.done.add(playerId);
    const connected = [...this.players.values()].filter((p) => p.connected);
    if (connected.every((p) => this.event!.done.has(p.id))) {
      this.event = null;
      this.health = Math.min(MAX_HEALTH, this.health + 15);
      this.nextEventAt = this.now() + this.eventInterval();
      events.push({ type: "eventPassed" });
    }
    return events;
  }

  private breakInterval(): number {
    // Rate steigt mit Sektor: ~14s runter bis min 6s
    return Math.max(6000, 14000 - this.level * 1000);
  }

  private countHazarded(): number {
    let n = 0;
    for (const p of this.players.values()) for (const c of p.panel) if (c.hazard) n++;
    return n;
  }

  clearHazard(playerId: string, controlId: string): GameEvent[] {
    const p = this.players.get(playerId);
    const c = p?.panel.find((x) => x.id === controlId);
    if (c && c.hazard) { c.hazard = ""; return [{ type: "repaired", playerId, controlId }]; }
    return [];
  }

  // ---------- Debug ----------
  forceStartEvent(type: string): GameEvent[] {
    if (this.phase !== "playing" || this.event) return [];
    if (type === "wormhole") this.rotatePanels();
    this.event = { type, endsAt: this.now() + this.EVENT_MS, done: new Set() };
    return [{ type: "eventStart" }];
  }
  debugHazard(kind: "broken" | "slimed"): GameEvent[] {
    if (this.phase !== "playing") return [];
    const taken = this.takenControlIds();
    const pool = this.allControls().filter((c) => !c.hazard && !taken.has(c.id));
    if (pool.length === 0) return [];
    const c = pick(pool, this.rng);
    c.hazard = kind;
    return [{ type: kind === "broken" ? "broke" : "slimed", controlId: c.id }];
  }
  debugClearHazards(): void {
    for (const p of this.players.values()) for (const c of p.panel) c.hazard = "";
  }
  debugHealth(delta: number): void {
    this.health = Math.max(0, Math.min(MAX_HEALTH, this.health + delta));
  }
  debugNextLevel(): GameEvent[] {
    if (this.phase !== "playing") return [];
    return [this.nextLevel()];
  }
  debugGameOver(): GameEvent[] {
    if (this.phase !== "playing") return [];
    this.phase = "over";
    return [{ type: "gameOver" }];
  }
  debugSolve(playerId: string, all: boolean): GameEvent[] {
    if (this.phase !== "playing") return [];
    const events: GameEvent[] = [];
    const targets = all ? [...this.players.values()] : ([this.players.get(playerId)].filter(Boolean) as EnginePlayer[]);
    for (const p of targets) {
      if (this.phase !== "playing") break;
      if (!p.instruction) continue;
      p.statCompleted++;
      this.health = Math.min(MAX_HEALTH, this.health + this.difficulty.completedHealthGain);
      events.push({ type: "completed", playerId: p.id });
      if (this.health >= MAX_HEALTH) events.push(this.nextLevel());
      else this.generateInstructionFor(p);
    }
    return events;
  }

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

    const untakenPreferred = target.panel.filter((c) => canTarget(c) && !taken.has(c.id) && !c.hazard);
    let pool = untakenPreferred;
    if (pool.length === 0) pool = this.allControls().filter((c) => canTarget(c) && !taken.has(c.id) && !c.hazard);
    if (pool.length === 0) pool = this.allControls().filter((c) => canTarget(c) && !c.hazard); // Notnagel
    if (pool.length === 0) pool = this.allControls().filter((c) => canTarget(c)); // absoluter Notnagel

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
    if (control.hazard) return { completed: false, events };

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
    if (this.paused) { this.lastTick = now; return events; }
    const dtMs = Math.max(0, now - this.lastTick);
    const dt = dtMs / 1000;
    this.lastTick = now;

    this.health -= this.difficulty.healthDrainPerSec * dt;
    this.deathLimit = Math.min(MAX_DEATH_LIMIT, this.deathLimit + this.difficulty.deathLimitRisePerSec * dt);

    // Aktives Spezial-Event: der Rest pausiert
    if (this.event) {
      for (const p of this.players.values()) if (p.instruction) p.instruction.deadline += dtMs;
      if (now >= this.event.endsAt) {
        const survived = this.event.type === "freeze";
        this.event = null;
        if (survived) { this.health = Math.min(MAX_HEALTH, this.health + 15); events.push({ type: "eventPassed" }); }
        else { this.health -= 15; events.push({ type: "eventFailed" }); }
        this.nextEventAt = now + this.eventInterval();
      }
      if (this.health <= this.deathLimit) { this.phase = "over"; events.push({ type: "gameOver" }); }
      return events;
    }

    // Neues Event faellig?
    if (now >= this.nextEventAt && this.players.size >= 2) {
      events.push(this.startEvent());
      return events;
    }

    // Panels koennen brechen (max. so viele gleichzeitig wie Spieler)
    if (now >= this.nextBreakAt) {
      this.nextBreakAt = now + this.breakInterval();
      if (this.countHazarded() < this.players.size) {
        const taken = this.takenControlIds();
        const pool = this.allControls().filter((c) => !c.hazard && !taken.has(c.id));
        if (pool.length > 0) {
          const c = pick(pool, this.rng);
          const kind = this.rng() < 0.5 ? "broken" : "slimed";
          c.hazard = kind as any;
          events.push({ type: kind === "broken" ? "broke" : "slimed", controlId: c.id });
        }
      }
    }

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
