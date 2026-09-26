import { Control, ControlType } from "./types";
import { Rng, pick, randInt } from "./rng";
import { makeControlLabel, makeSelectorOptions } from "./technobabble";

const TYPES: ControlType[] = ["button", "toggle", "slider", "selector", "dial"];

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter}`;
}

export function makeControl(ownerId: string, rng: Rng): Control {
  const type = pick(TYPES, rng);
  const base: Control = {
    id: nextId("ctl"),
    type,
    label: makeControlLabel(rng),
    value: "",
    ownerId,
  };
  if (type === "toggle") {
    base.value = rng() < 0.5 ? "true" : "false";
  } else if (type === "slider" || type === "dial") {
    base.min = 0;
    base.max = randInt(3, 6, rng);
    base.value = String(randInt(base.min, base.max, rng));
  } else if (type === "selector") {
    base.options = makeSelectorOptions(rng, randInt(2, 4, rng));
    base.value = pick(base.options, rng);
  }
  // Footprint fuers Panel-Layout (dichtes Raster im Client)
  if (type === "slider") { base.w = 2; base.h = rng() < 0.25 ? 2 : 1; }
  else if (type === "dial") { base.w = 2; base.h = 2; }
  else if (type === "selector") { base.w = (base.options?.length ?? 0) >= 3 ? 2 : 1; base.h = 1; }
  else { base.w = 1; base.h = 1; }

  return base;
}

export function generatePanel(ownerId: string, size: number, rng: Rng): Control[] {
  const controls: Control[] = [];
  const usedLabels = new Set<string>();
  while (controls.length < size) {
    const c = makeControl(ownerId, rng);
    if (usedLabels.has(c.label)) continue; // eindeutige Labels pro Panel
    usedLabels.add(c.label);
    controls.push(c);
  }
  return controls;
}
