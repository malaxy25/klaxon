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
  return Math.min(6, 4 + Math.ceil(level / 4));
}
