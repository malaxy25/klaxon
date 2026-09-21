import { Rng, pick } from "./rng";

const PREFIXES = ["Flux", "Techno", "Cryo", "Quantum", "Plasma", "Neutrino", "Hydro", "Astro", "Gyro", "Photon", "Ion", "Warp"];
const NOUNS = ["capacitor", "beam", "matrix", "coupling", "injector", "manifold", "dampener", "array", "reactor", "thruster", "conduit", "modulator"];
const ADJECTIVES = ["auxiliary", "primary", "reverse", "lateral", "inverted", "cardinal", "spectral", "dorsal"];
const ACTIONS = ["reboot", "purge", "align", "vent", "prime", "sync", "calibrate", "reroute"];

export function makeControlLabel(rng: Rng): string {
  if (rng() < 0.34) return `${pick(ADJECTIVES, rng)} ${pick(NOUNS, rng)}`;
  return `${pick(PREFIXES, rng)}${pick(NOUNS, rng)}`;
}

export function makeSelectorOptions(rng: Rng, n: number): string[] {
  const shuffled = [...ACTIONS].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

// nur für den freistehenden Demo-Export
export function randomTechnobabble(rng: Rng = Math.random): string {
  return makeControlLabel(rng);
}
