// Welche Panne braucht welche Mindest-Kachelgroesse (Footprint w x h)
export const HAZARD_KINDS = ["broken", "slimed", "frozen", "electro", "overheat", "rewire"] as const;
export const HAZARD_MIN: Record<string, { w: number; h: number }> = {
  broken: { w: 1, h: 1 }, slimed: { w: 1, h: 1 }, frozen: { w: 1, h: 1 },
  electro: { w: 1, h: 1 }, overheat: { w: 1, h: 1 }, rewire: { w: 2, h: 1 },
};
