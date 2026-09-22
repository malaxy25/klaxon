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
  private nextBreakAt = 0;

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
    this.nextBreakAt = this.now() + this.breakInterval();
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
  private breakInterval(): number {
    // Rate steigt mit Sektor: ~14s runter bis min 6s
    return Math.max(6000, 14000 - this.level * 1000);
  }

  private countBroken(): number {
    let n = 0;
    for (const p of this.players.values()) for (const c of p.panel) if (c.broken) n++;
    return n;
  }

  repair(playerId: string, controlId: string): GameEvent[] {
    const p = this.players.get(playerId);
    const c = p?.panel.find((x) => x.id === controlId);
    if (c && c.broken) { c.broken = false; return [{ type: "repaired", playerId, controlId }]; }
    return [];
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

    const untakenPreferred = target.panel.filter((c) => canTarget(c) && !taken.has(c.id) && !c.broken);
    let pool = untakenPreferred;
    if (pool.length === 0) pool = this.allControls().filter((c) => canTarget(c) && !taken.has(c.id) && !c.broken);
    if (pool.length === 0) pool = this.allControls().filter((c) => canTarget(c) && !c.broken); // Notnagel
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
    if (control.broken) return { completed: false, events };

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

    // Panels koennen brechen (max. so viele gleichzeitig wie Spieler)
    if (now >= this.nextBreakAt) {
      this.nextBreakAt = now + this.breakInterval();
      if (this.countBroken() < this.players.size) {
        const taken = this.takenControlIds();
        const pool = this.allControls().filter((c) => !c.broken && !taken.has(c.id));
        if (pool.length > 0) {
          const c = pick(pool, this.rng);
          c.broken = true;
          events.push({ type: "broke", controlId: c.id });
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
