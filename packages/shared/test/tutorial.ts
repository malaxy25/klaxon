import { KlaxonGame, mulberry32, GameEvent } from "../src/index";

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗ FAIL:", name); }
}

let t = 5_000_000;
const now = () => t;

function newTraining(n: number, seed: number): KlaxonGame {
  const g = new KlaxonGame({ rng: mulberry32(seed), now });
  for (let i = 0; i < n; i++) { g.addPlayer("P" + i, "Pilot" + i); g.setReady("P" + i, true); }
  g.setStartLevel(0);
  g.start();
  return g;
}

// Eine "perfekte Crew": OK tippen, Pannen beheben, Befehle ausfuehren, Events bestehen.
function playStep(g: KlaxonGame, seen: { kinds: Set<string>; events: GameEvent[] }): void {
  const tut = g.tutorial!;
  seen.kinds.add(tut.step().kind);
  for (const p of g.players.values()) {
    const c = tut.coach(p.id);
    if (c.ack && !c.acked) seen.events.push(...g.ackTutorial(p.id));
  }
  if (g.event) {
    if (g.event.type !== "freeze") for (const p of g.players.values()) seen.events.push(...g.markEventDone(p.id));
  }
  for (const p of g.players.values()) {
    const ins = p.instruction;
    if (!ins) continue;
    for (const o of g.players.values()) {
      const c = o.panel.find((x) => x.id === ins.targetControlId);
      if (!c) continue;
      if (c.hazard && c.hazard !== "overheat") seen.events.push(...g.clearHazard(o.id, c.id));
      if (!c.hazard) seen.events.push(...g.handleControlChange(o.id, c.id, ins.targetValue).events);
    }
  }
  t += 500;
  seen.events.push(...g.tick());
}

console.log("== Training komplett durchspielen (3 Spieler) ==");
const g = newTraining(3, 42);
check("Training laeuft (phase playing, tutorial gesetzt)", g.phase === "playing" && !!g.tutorial);
const total = g.tutorial!.total();
check("Schrittzahl plausibel (>= 20)", total >= 20);
check("Kein Aderlass im Training", (() => { const h = g.health; t += 10000; g.tick(); return g.health === h; })());
const seen = { kinds: new Set<string>(), events: [] as GameEvent[] };
let maxStep = 0;
for (let i = 0; i < 5000 && g.tutorial; i++) { maxStep = Math.max(maxStep, g.tutorial.stepNo()); playStep(g, seen); }
check("Training endet in der Lobby", g.phase === "lobby" && g.tutorial === null);
check("Danach ist Casual gewaehlt", g.startLevel === 1);
check("Alle Schritte besucht", maxStep === total);
check("Alle Schrittarten vorgekommen", ["info", "own", "relay", "parallel", "timer", "hazard", "event", "done"].every((k) => seen.kinds.has(k)));
const types = new Set(seen.events.map((e) => e.type));
check("Alle 6 Pannen ausgeloest", ["broke", "slimed", "frozen", "electro", "overheat", "rewire"].every((k) => types.has(k as GameEvent["type"])));
check("6 Events bestanden", seen.events.filter((e) => e.type === "eventPassed").length === 6);
check("Kein Game Over", !types.has("gameOver"));

console.log("== Timer-Schritt: Ablauf ohne Schaden ==");
const g2 = newTraining(2, 7);
const tut2 = g2.tutorial!;
while (tut2.step().kind !== "timer") g2.skipTutorialStep();
const h2 = g2.health;
check("Timer-Schritt meldet Timer an Clients", tut2.timerMs() > 0);
t += 31000;
const ev2 = g2.tick();
check("Ablauf feuert expired", ev2.some((e) => e.type === "expired"));
check("Ablauf kostet keine Health", g2.health === h2);
check("Neuer Befehl nach Ablauf", [...g2.players.values()].every((p) => p.instruction !== null));
check("Coach erklaert den Ablauf", tut2.coach("P0").text.startsWith("Too slow"));

console.log("== Event verpatzt -> nochmal ==");
while (tut2.step().kind !== "event") g2.skipTutorialStep();
const evIdx = tut2.stepNo();
g2.ackTutorial("P0"); g2.ackTutorial("P1");
check("Event startet nach allen OKs", !!g2.event);
t += 11000;
const ev3 = g2.tick();
check("Event-Fehlschlag gemeldet", ev3.some((e) => e.type === "eventFailed"));
check("Gleicher Schritt, wieder Briefing", tut2.stepNo() === evIdx && !g2.event && tut2.coach("P0").ack);
check("Fehlschlag kostet keine Health", g2.health === h2);

console.log("== Spieler geht mitten im Zuruf-Schritt ==");
const g3 = newTraining(3, 99);
const tut3 = g3.tutorial!;
while (tut3.step().kind !== "relay") g3.skipTutorialStep();
const reader = [...g3.players.values()].find((p) => p.instruction)!;
g3.removePlayer(reader.id);
const ins = [...g3.players.values()].map((p) => p.instruction).filter(Boolean);
check("Schritt neu aufgesetzt mit verbleibenden Spielern", ins.length === 1 && [...g3.players.values()].some((p) => p.panel.some((c) => c.id === ins[0]!.targetControlId)));
g3.removePlayer([...g3.players.keys()][0]);
check("Unter 2 Spielern -> zurueck in die Lobby", g3.phase === "lobby" && g3.tutorial === null);

console.log("== Host bricht ab ==");
const g4 = newTraining(2, 3);
g4.endTutorial();
check("Abbruch -> Lobby, Panels leer", g4.phase === "lobby" && [...g4.players.values()].every((p) => p.panel.length === 0));

console.log(`\n== ERGEBNIS: ${pass} bestanden, ${fail} fehlgeschlagen ==`);
if (fail > 0) process.exit(1);
