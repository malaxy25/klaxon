export type ControlType = "button" | "toggle" | "slider" | "selector";

export interface Control {
  id: string;
  type: ControlType;
  label: string;
  value: string;
  min?: number;
  max?: number;
  options?: string[];
  ownerId: string;
}

export interface Instruction {
  id: string;
  sourceId: string;
  targetControlId: string;
  targetValue: string;
  text: string;
  deadline: number;
}

export type Phase = "lobby" | "playing" | "over";

export interface Difficulty {
  instructionTimeMs: number;
  healthDrainPerSec: number;
  deathLimitRisePerSec: number;
  completedHealthGain: number;
  expiredHealthLoss: number;
}

export interface GameEvent {
  type: "completed" | "expired" | "nextLevel" | "gameOver";
  playerId?: string;
}