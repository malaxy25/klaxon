// Leaderboard rules (no database): score, pace, percentage, which runs count.
import { runScore, perMinute, betterThan, countsForLeaderboard, MIN_COMPARE, MIN_DURATION_SEC } from "../src/leaderboard";

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗ FAIL:", name); }
}

console.log("== Leaderboard ==");
check("Score = Sektor auf Casual (Start 1)", runScore(1, 7) === 7);
check("Score mit Bonus fuer uebersprungene Sektoren (Normal, Start 3)", runScore(3, 7) === 9);
check("Score gleich wie Game-over-Rang (Insane, Start 8)", runScore(8, 9) === 16);

check("Tempo pro Minute", perMinute(30, 300) === 6);
check("Tempo bei Dauer 0", perMinute(5, 0) === 0);

check("Zu wenig Vergleich -> null", betterThan(3, MIN_COMPARE - 1) === null);
check("Bester von 11 -> 100 %", betterThan(10, 11) === 100);
check("Schlechtester von 11 -> 0 %", betterThan(0, 11) === 0);
check("Mitte von 11 -> 50 %", betterThan(5, 11) === 50);

const ok = { startSector: 3, crew: 3, durationSec: 120 };
check("Normales Spiel zaehlt", countsForLeaderboard(ok));
check("Training zaehlt nicht", !countsForLeaderboard({ ...ok, startSector: 0 }));
check("Allein zaehlt nicht", !countsForLeaderboard({ ...ok, crew: 1 }));
check("Zu kurz zaehlt nicht", !countsForLeaderboard({ ...ok, durationSec: MIN_DURATION_SEC - 1 }));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
