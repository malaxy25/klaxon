export type ControlType = "button" | "toggle" | "slider" | "selector" | "dial";

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
  hazard?: "broken" | "slimed" | "frozen" | "electro" | "overheat" | "rewire" | "";
  hazardUntil?: number;  // fuer zeitbasierte Pannen (overheat) // Panne: kaputt (halten) / verschleimt (wischen)
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
  type: "completed" | "expired" | "nextLevel" | "gameOver" | "broke" | "slimed" | "frozen" | "electro" | "overheat" | "rewire" | "repaired" | "eventStart" | "eventPassed" | "eventFailed" | "sectorCleared";
  playerId?: string;
  controlId?: string;
}
