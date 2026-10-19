import type { KlaxonGame, EnginePlayer } from "./engine";
import { ControlType, GameEvent } from "./types";
import { canTarget } from "./instructions";
import { pick } from "./rng";
import { HAZARD_KINDS, HAZARD_MIN } from "./hazards";
import { STARTING_HEALTH } from "./difficulty";

// Gefuehrtes Training: feste Schrittfolge ohne Zeitdruck und ohne Schaden.
// Die Engine delegiert im Training tick/Erfuellung/Events hierher.

type Step =
  | { kind: "info"; title: string; text: string }
  | { kind: "own"; title: string; types: ControlType[] }
  | { kind: "relay"; title: string; k: number }
  | { kind: "parallel"; title: string }
  | { kind: "timer"; title: string }
  | { kind: "hazard"; title: string; hazard: string; k: number }
  | { kind: "event"; title: string; event: string }
  | { kind: "done"; title: string; text: string };

export type CoachRole = "info" | "brief" | "own" | "reader" | "doer" | "watch" | "fix" | "wait" | "success" | "event";
export interface Coach {
  role: CoachRole;
  text: string;
  ack: boolean;       // OK-Button anzeigen
  acked: boolean;     // schon OK getippt
  highlight: string;  // Control-ID, die pulsiert
}

const TIMER_MS = 30000;
const SUCCESS_MS = 2200;
const EVENT_MS = 10000;
const MAX_RELAYS = 4;

const HOW: Record<string, string> = {
  button: "Press the red button.",
  toggle: "Flip the switch.",
  slider: "Slide it to the number.",
  dial: "Tap or turn the dial to the number.",
  selector: "Tap the right option.",
};

const HAZ: Record<string, { title: string; fix: string }> = {
  broken: { title: "Jammed", fix: "JAMMED! Press and HOLD the control until it is fixed." },
  slimed: { title: "Alien slime", fix: "SLIME! Wipe it off - swipe back and forth over it." },
  frozen: { title: "Frozen", fix: "FROZEN! Tap it 4 times to break the ice." },
  electro: { title: "Short circuit", fix: "SHORT CIRCUIT! Press and HOLD to stabilize it." },
  overheat: { title: "Overheat", fix: "OVERHEAT! Don't touch - it cools down by itself in a few seconds." },
  rewire: { title: "Loose wire", fix: "LOOSE WIRE! Drag the plug into the glowing socket." },
};

const EV: Record<string, { title: string; brief: string }> = {
  meteor: { title: "Meteor shower", brief: "METEOR SHOWER: when the alert comes, everyone SHAKES their phone hard. No motion sensor? A tap button shows up instead." },
  blackhole: { title: "Black hole", brief: "BLACK HOLE: everyone FLIPS their phone - turn it over or onto its side." },
  brace: { title: "Brace", brief: "BRACE: everyone TAPS the big button fast." },
  surge: { title: "Power surge", brief: "POWER SURGE: everyone presses and HOLDS the button until the bar is full." },
  freeze: { title: "Decompression", brief: "DECOMPRESSION: the opposite - NOBODY touches the screen until the timer runs out!" },
  wormhole: { title: "Wormhole", brief: "WORMHOLE: your panels get passed on to the next crew member - for good! Everyone taps STABILIZE." },
};
const EVENT_ORDER = ["meteor", "blackhole", "brace", "surge", "freeze", "wormhole"];

const CHEERS = ["Nice!", "Great job!", "Smooth flying!", "Well done, crew!", "Textbook!"];

export class Tutorial {
  steps: Step[] = [];
  idx = 0;
  private pending = new Set<string>();  // wer noch etwas tun muss (Befehl oder OK)
  private acked = new Set<string>();
  private involved = new Set<string>(); // Vorleser/Ausfuehrender des aktuellen Schritts
  private roles = new Map<string, { role: CoachRole; text: string; highlight: string }>();
  private notes = new Map<string, string>();
  private successUntil = 0;
  private successText = "";
  private healthAtStart = 0;
  private eventLive = false;
  private count = 0;
  private need = 0;

  constructor(private game: KlaxonGame) {}

  begin(): GameEvent[] {
    this.steps = this.build(this.crew().length);
    this.idx = 0;
    return this.setup();
  }

  // ---------- Anzeige ----------
  step(): Step { return this.steps[this.idx]; }
  stepNo(): number { return this.idx + 1; }
  total(): number { return this.steps.length; }
  title(): string { return this.step()?.title ?? ""; }
  timerMs(): number { return this.step()?.kind === "timer" && !this.successUntil ? TIMER_MS : 0; }

  coach(playerId: string): Coach {
    if (this.successUntil) return { role: "success", text: this.successText, ack: false, acked: false, highlight: "" };
    const r = this.roles.get(playerId) ?? { role: "watch" as CoachRole, text: "Watch the crew - your turn comes.", highlight: "" };
    let text = r.text;
    const note = this.notes.get(playerId);
    if (note) text = note + " " + text;
    if (this.step().kind === "timer") text += ` Crew: ${this.count}/${this.need}`;
    const ack = this.isAckStep() && (this.pending.has(playerId) || this.acked.has(playerId));
    return { role: r.role, text, ack, acked: this.acked.has(playerId), highlight: r.highlight };
  }

  // ---------- Ablauf ----------
  private build(n: number): Step[] {
    const s: Step[] = [];
    s.push({ kind: "info", title: "Welcome aboard", text: "This is training: no timer, no damage. Everyone has their own panel of controls. Read boxes like this one, then tap OK." });
    s.push({ kind: "own", title: "Your controls", types: ["slider", "dial"] });
    s.push({ kind: "own", title: "Your controls", types: ["button", "toggle", "selector"] });
    s.push({ kind: "info", title: "Shout it out", text: "Here is the trick: most commands are for SOMEONE ELSE's panel. Read yours out loud - whoever has that control does it." });
    for (let k = 0; k < Math.min(Math.max(n, 2), MAX_RELAYS); k++) s.push({ kind: "relay", title: "Shout it out", k });
    s.push({ kind: "parallel", title: "All at once" });
    s.push({ kind: "info", title: "Beat the clock", text: "In a real game every command has a timer - the bar under it. In time: the hull bar at the top goes up. Too slow: it goes down. Try it - still no damage here." });
    s.push({ kind: "timer", title: "Beat the clock" });
    s.push({ kind: "info", title: "Things break", text: "Controls get damaged. A damaged control does nothing until its owner fixes it - each problem has its own fix. Let's go through all six." });
    HAZARD_KINDS.forEach((h, k) => s.push({ kind: "hazard", title: HAZ[h].title, hazard: h, k }));
    s.push({ kind: "info", title: "Crew alerts", text: "Sometimes the WHOLE crew must react at once. A full-screen alert tells you what to do and everybody has to make it. Six to practice." });
    for (const e of EVENT_ORDER) s.push({ kind: "event", title: EV[e].title, event: e });
    s.push({ kind: "done", title: "Crew certified", text: "You know everything now! Tap OK to return to the ready room - Casual is selected for your first real flight." });
    return s;
  }

  // Aktive Crew in Beitrittsreihenfolge (ohne Offline-Spieler, ausser alle sind offline)
  private crew(): EnginePlayer[] {
    const all = [...this.game.players.values()];
    const on = all.filter((p) => p.connected);
    return on.length ? on : all;
  }

  private rng = () => this.game.random();

  private isAckStep(): boolean {
    const k = this.step()?.kind;
    return k === "info" || k === "done" || (k === "event" && !this.eventLive);
  }

  private setup(): GameEvent[] {
    const g = this.game;
    for (const p of g.players.values()) {
      p.instruction = null;
      for (const c of p.panel) { c.hazard = ""; c.hazardUntil = undefined; }
    }
    g.event = null;
    this.pending.clear(); this.acked.clear(); this.involved.clear(); this.roles.clear(); this.notes.clear();
    this.successUntil = 0; this.eventLive = false; this.count = 0; this.need = 0;

    const step = this.step();
    const crew = this.crew();
    const n = crew.length;
    const events: GameEvent[] = [{ type: "tutorialStep" }];
    // Bei Infos und vor vollem Balken zuruecksetzen, damit "Hull +10" sichtbar bleibt
    if (step.kind === "info" || step.kind === "done" || g.health > 80) g.health = STARTING_HEALTH;
    this.healthAtStart = g.health;

    switch (step.kind) {
      case "info":
      case "done":
        for (const p of crew) { this.pending.add(p.id); this.roles.set(p.id, { role: "info", text: step.text, highlight: "" }); }
        break;

      case "own":
        for (const p of crew) {
          let pool = p.panel.filter((c) => canTarget(c) && step.types.includes(c.type));
          if (pool.length === 0) pool = p.panel.filter(canTarget);
          const c = pick(pool, this.rng);
          g.giveInstruction(p, c);
          this.pending.add(p.id);
          this.roles.set(p.id, { role: "own", text: "This command is for YOUR panel. " + HOW[c.type], highlight: c.id });
        }
        break;

      case "relay": {
        const reader = crew[step.k % n];
        const doer = n > 1 ? crew[(step.k + 1) % n] : reader;
        const c = pick(doer.panel.filter(canTarget), this.rng);
        g.giveInstruction(reader, c);
        this.pending.add(reader.id);
        this.involved.add(reader.id); this.involved.add(doer.id);
        for (const p of crew) this.roles.set(p.id, { role: "watch", text: `${reader.name} reads, ${doer.name} does. Your turn comes.`, highlight: "" });
        if (reader === doer) {
          this.roles.set(reader.id, { role: "own", text: "Read it out loud anyway - in a real game it is usually on someone else's panel.", highlight: c.id });
        } else {
          this.roles.set(reader.id, { role: "reader", text: `Read your command OUT LOUD. It is not on your panel - ${doer.name} has it.`, highlight: "" });
          this.roles.set(doer.id, { role: "doer", text: `Listen! ${reader.name} calls out a control on YOUR panel (it is blinking). Do it!`, highlight: c.id });
        }
        break;
      }

      case "parallel": {
        const taken = new Set<string>();
        for (const p of crew) {
          const others = n > 1 ? crew.filter((o) => o.id !== p.id) : crew;
          let pool = others.flatMap((o) => o.panel).filter((c) => canTarget(c) && !taken.has(c.id));
          if (pool.length === 0) pool = g.allControls().filter((c) => canTarget(c) && !taken.has(c.id));
          const c = pick(pool, this.rng);
          taken.add(c.id);
          g.giveInstruction(p, c);
          this.pending.add(p.id);
          this.roles.set(p.id, { role: "reader", text: "Everyone has a command now. Shout yours and listen for yours - no timer yet.", highlight: "" });
        }
        break;
      }

      case "timer":
        this.need = Math.max(3, n);
        for (const p of crew) {
          g.generateInstructionFor(p, TIMER_MS);
          this.roles.set(p.id, { role: "reader", text: "Beat the timer bar under your command! Shout and listen.", highlight: "" });
        }
        break;

      case "hazard": {
        const doer = crew[step.k % n];
        const reader = n > 1 ? crew[(step.k + 1) % n] : doer;
        const min = HAZARD_MIN[step.hazard] ?? { w: 1, h: 1 };
        let pool = doer.panel.filter((c) => canTarget(c) && (c.w ?? 1) >= min.w && (c.h ?? 1) >= min.h);
        if (pool.length === 0) pool = doer.panel.filter(canTarget);
        const c = pick(pool, this.rng);
        events.push(g.applyHazard(c, step.hazard));
        g.giveInstruction(reader, c);
        this.pending.add(reader.id);
        this.involved.add(reader.id); this.involved.add(doer.id);
        const fix = HAZ[step.hazard].fix;
        for (const p of crew) this.roles.set(p.id, { role: "watch", text: `${doer.name} has a damaged control. Watch how it is fixed.`, highlight: "" });
        if (reader === doer) {
          this.roles.set(doer.id, { role: "fix", text: fix + " Then do your command.", highlight: c.id });
        } else {
          this.roles.set(reader.id, { role: "reader", text: `Read your command out loud. ${doer.name}'s control is damaged - it has to be fixed first.`, highlight: "" });
          this.roles.set(doer.id, { role: "fix", text: fix + ` Then do what ${reader.name} calls out.`, highlight: c.id });
        }
        break;
      }

      case "event":
        this.brief(EV[step.event].brief + " Tap OK when ready.");
        break;
    }
    return events;
  }

  private brief(text: string): void {
    this.pending.clear(); this.acked.clear(); this.roles.clear();
    for (const p of this.crew()) { this.pending.add(p.id); this.roles.set(p.id, { role: "brief", text, highlight: "" }); }
  }

  private success(): GameEvent[] {
    for (const p of this.game.players.values()) p.instruction = null;
    const gained = Math.round(this.game.health - this.healthAtStart);
    this.successText = pick(CHEERS, this.rng) + (gained > 0 ? ` Hull +${gained}.` : "");
    this.successUntil = this.game.time() + SUCCESS_MS;
    return [{ type: "tutorialSuccess" }];
  }

  private advance(): GameEvent[] {
    this.idx++;
    if (this.idx >= this.steps.length) return this.game.endTutorial();
    return this.setup();
  }

  // Alle Pflicht-OKs da: Info weiter, Training beenden oder Event starten
  private allAcked(): GameEvent[] {
    const step = this.step();
    if (step.kind === "done") return this.game.endTutorial();
    if (step.kind === "event") {
      this.eventLive = true;
      for (const p of this.crew()) this.roles.set(p.id, { role: "event", text: "Alert! Follow the instructions on screen.", highlight: "" });
      return [this.game.beginEvent(step.event, EVENT_MS)];
    }
    return this.advance();
  }

  // ---------- Hooks aus der Engine ----------
  ack(playerId: string): GameEvent[] {
    if (this.successUntil || !this.isAckStep() || !this.pending.has(playerId)) return [];
    this.pending.delete(playerId);
    this.acked.add(playerId);
    return this.pending.size === 0 ? this.allAcked() : [];
  }

  skip(): GameEvent[] {
    this.game.event = null;
    if (this.step().kind === "done") return this.game.endTutorial();
    return this.advance();
  }

  onCompleted(sourceId: string): GameEvent[] {
    if (this.successUntil) return [];
    const step = this.step();
    this.notes.delete(sourceId);
    if (step.kind === "timer") {
      this.count++;
      if (this.count >= this.need) return this.success();
      const p = this.game.players.get(sourceId);
      if (p) this.game.generateInstructionFor(p, TIMER_MS);
      return [];
    }
    this.pending.delete(sourceId);
    if (step.kind === "own" || step.kind === "parallel") {
      this.roles.set(sourceId, { role: "wait", text: step.kind === "own" ? "Done! Waiting for the rest of the crew..." : "Yours is done! Keep listening - the others may need your controls.", highlight: "" });
    }
    return this.pending.size === 0 ? this.success() : [];
  }

  onEventResult(passed: boolean): GameEvent[] {
    this.eventLive = false;
    const step = this.step();
    if (passed || step.kind !== "event") return this.success();
    this.brief("Not quite - the whole crew has to make it. " + EV[step.event].brief + " Tap OK to try again.");
    return [];
  }

  onPlayerRemoved(id: string): GameEvent[] {
    this.pending.delete(id); this.acked.delete(id); this.roles.delete(id); this.notes.delete(id);
    if (this.successUntil || this.eventLive) return [{ type: "tutorialStep" }];
    const k = this.step().kind;
    // Befehle koennen auf Controls des Gegangenen zeigen -> Schritt neu aufsetzen
    if (k === "relay" || k === "hazard" || k === "parallel" || k === "timer") return this.setup();
    if (this.pending.size === 0) return k === "own" ? this.success() : this.allAcked();
    return [{ type: "tutorialStep" }];
  }

  tick(now: number): GameEvent[] {
    const g = this.game;
    const events = g.coolHazards(now);
    if (g.event) {
      if (now >= g.event.endsAt) events.push(...g.expireEvent());
      return events;
    }
    if (this.successUntil) {
      if (now >= this.successUntil) events.push(...this.advance());
      return events;
    }
    if (this.step().kind === "timer") {
      for (const p of g.players.values()) {
        if (p.instruction && now >= p.instruction.deadline) {
          events.push({ type: "expired", playerId: p.id });
          this.notes.set(p.id, "Too slow! In a real game that costs hull. Here is a new one.");
          g.generateInstructionFor(p, TIMER_MS);
        }
      }
    }
    return events;
  }
}
