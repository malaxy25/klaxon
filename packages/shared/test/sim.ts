import { KlaxonGame, mulberry32, Instruction, Control } from "../src/index";

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗ FAIL:", name); }
}

// Mutable Uhr für deterministische Zeit
let t = 1_000_000;
const now = () => t;
const rng = mulberry32(12345);

function allInstructions(g: KlaxonGame): Instruction[] {
  return [...g.players.values()].map(p => p.instruction).filter((i): i is Instruction => i !== null);
}
function findControl(g: KlaxonGame, id: string): Control | undefined {
  for (const p of g.players.values()) { const c = p.panel.find(x => x.id === id); if (c) return c; }
  return undefined;
}
function ownerOf(g: KlaxonGame, controlId: string): string | undefined {
  return findControl(g, controlId)?.ownerId;
}

console.log("== Setup: 3 Spieler, Lobby -> Start ==");
const g = new KlaxonGame({ rng, now });
g.addPlayer("A", "Alice");
g.addPlayer("B", "Bob");
g.addPlayer("C", "Cara");
check("Erster Spieler ist Host", g.players.get("A")!.host === true);
check("canStart() false ohne ready", g.canStart() === false);
g.setReady("A", true); g.setReady("B", true); g.setReady("C", true);
g.setStartLevel(1); // Mechanik-Tests auf ruhigem Level 1
check("canStart() true wenn alle ready", g.canStart() === true);
check("start() erfolgreich", g.start() === true);
check("Phase = playing", g.phase === "playing");
check("Level = 1", g.level === 1);

console.log("== Invarianten nach Start ==");
for (const p of g.players.values()) {
  check(`Spieler ${p.id} hat Panel`, p.panel.length >= 5);
  check(`Spieler ${p.id} hat einen Befehl`, p.instruction !== null);
}
let ins = allInstructions(g);
check("Jeder Befehl zeigt auf existierendes Control", ins.every(i => findControl(g, i.targetControlId) !== undefined));
check("Kein Control ist Ziel von zwei Befehlen", new Set(ins.map(i => i.targetControlId)).size === ins.length);
check("Zielwert != aktueller Wert (frisch)", ins.every(i => {
  const c = findControl(g, i.targetControlId)!;
  return c.type === "button" || c.value !== i.targetValue;
}));

console.log("== Perfektes Team: Befehle lösen -> Health steigt -> Level-Up ==");
const startLevel = g.level;
const timeL1 = g.difficulty.instructionTimeMs;
let solved = 0;
for (let iter = 0; iter < 2000 && g.level === startLevel; iter++) {
  const list = allInstructions(g);
  if (list.length === 0) break;
  const i = list[0];
  const owner = ownerOf(g, i.targetControlId)!;
  const res = g.handleControlChange(owner, i.targetControlId, i.targetValue);
  if (res.completed) solved++;
  t += 100; // etwas Zeit vergeht (weit unter Deadline)
  g.tick();  // Drain/Ablauf mitlaufen lassen
}
check("Mehrere Befehle erfüllt", solved > 0);
check("Level ist gestiegen", g.level > startLevel);
check("Schwierigkeit härter (kürzere Zeit)", g.difficulty.instructionTimeMs < timeL1);
check("Nach Level-Up wieder frische Befehle, Invariante hält", (() => {
  const l = allInstructions(g);
  return new Set(l.map(x => x.targetControlId)).size === l.length && l.every(x => findControl(g, x.targetControlId));
})());

console.log("== Ablauf (expiry): Zeit über Deadline ohne Lösen ==");
const g2 = new KlaxonGame({ rng: mulberry32(7), now, singlePlayer: false });
g2.addPlayer("X", "X"); g2.addPlayer("Y", "Y");
g2.setReady("X", true); g2.setReady("Y", true);
g2.setStartLevel(15); // kurze Instruktionszeit (7,5s < 18s Event-Schwelle) -> Expiry feuert sauber
g2.start();
const hBefore = g2.health;
const oldIds = new Set(allInstructions(g2).map(i => i.id));
t += g2.difficulty.instructionTimeMs + 10; // über die Deadline
const evExp = g2.tick();
check("expired-Event ausgelöst", evExp.some(e => e.type === "expired"));
check("Health gesunken nach Ablauf", g2.health < hBefore);
check("Neue Befehls-IDs nach Ablauf", allInstructions(g2).some(i => !oldIds.has(i.id)));

console.log("== Schlechtes Team: nur Zeit -> Game Over ==");
const g3 = new KlaxonGame({ rng: mulberry32(9), now });
g3.addPlayer("P", "P"); g3.addPlayer("Q", "Q");
g3.setReady("P", true); g3.setReady("Q", true);
g3.start();
let over = false;
for (let k = 0; k < 100000 && !over; k++) { t += 500; over = g3.tick().some(e => e.type === "gameOver"); }
check("Game Over tritt ein", over === true);
check("Phase = over", g3.phase === "over");

console.log("== Zielverteilung ~1/6 Eigenanteil (3 Spieler) ==");
const g4 = new KlaxonGame({ rng: mulberry32(2024), now });
g4.addPlayer("1","1"); g4.addPlayer("2","2"); g4.addPlayer("3","3");
g4.setReady("1",true); g4.setReady("2",true); g4.setReady("3",true);
g4.start();
const seen = new Set<string>();
let self = 0, total = 0;
for (let iter = 0; iter < 6000; iter++) {
  for (const i of allInstructions(g4)) {
    if (!seen.has(i.id)) {
      seen.add(i.id);
      total++;
      if (ownerOf(g4, i.targetControlId) === i.sourceId) self++;
    }
  }
  const list = allInstructions(g4);
  if (list.length) {
    const i = list[0];
    // lösen, aber Level-Ups vermeiden verfälscht nichts – wir zählen weiter
    g4.handleControlChange(ownerOf(g4, i.targetControlId)!, i.targetControlId, i.targetValue);
  }
  t += 50; g4.tick();
}
const frac = self / total;
console.log(`  Eigenanteil: ${self}/${total} = ${frac.toFixed(3)} (Ziel ~0.167)`);
check("Eigenanteil grob bei 1/6 (0.11–0.23)", frac > 0.11 && frac < 0.23);

console.log(`\n== ERGEBNIS: ${pass} bestanden, ${fail} fehlgeschlagen ==`);
if (fail > 0) process.exit(1);
