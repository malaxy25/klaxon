import { Control, Instruction } from "./types";
import { Rng, pick, randInt } from "./rng";

let counter = 0;
function nextId(): string {
  counter += 1;
  return "ins_" + counter;
}

export function canTarget(c: Control): boolean {
  switch (c.type) {
    case "button": return true;
    case "toggle": return true;
    case "slider": return (c.max ?? 0) > (c.min ?? 0);
    case "selector": return (c.options?.length ?? 0) > 1;
  }
}

export function pickTargetValue(c: Control, rng: Rng): string {
  switch (c.type) {
    case "button":
      return "";
    case "toggle":
      return c.value === "true" ? "false" : "true";
    case "slider": {
      const min = c.min ?? 0;
      const max = c.max ?? 0;
      const cur = Number(c.value);
      let v = cur;
      while (v === cur) v = randInt(min, max, rng);
      return String(v);
    }
    case "selector": {
      const opts = c.options ?? [];
      let v = c.value;
      while (v === c.value) v = pick(opts, rng);
      return v;
    }
  }
}

export function instructionText(c: Control, targetValue: string, rng: Rng): string {
  switch (c.type) {
    case "button":
      return pick(["Press " + c.label, "Engage " + c.label, "Trigger " + c.label], rng);
    case "toggle":
      return targetValue === "true"
        ? pick(["Engage " + c.label, "Activate " + c.label, "Switch on " + c.label], rng)
        : pick(["Disengage " + c.label, "Deactivate " + c.label, "Switch off " + c.label], rng);
    case "slider": {
      const cur = Number(c.value);
      const v = Number(targetValue);
      const opts: string[] = ["Set " + c.label + " to " + v, "Dial " + c.label + " to " + v];
      if (v === (c.max ?? v)) opts.push("Set " + c.label + " to max", "Max out " + c.label);
      else if (v === (c.min ?? v)) opts.push("Set " + c.label + " to min", "Zero out " + c.label);
      else if (v > cur) opts.push("Increase " + c.label + " to " + v);
      else opts.push("Decrease " + c.label + " to " + v, "Reduce " + c.label + " to " + v);
      return pick(opts, rng);
    }
    case "selector":
      return pick(["Set " + c.label + " to " + targetValue, "Switch " + c.label + " to " + targetValue], rng);
  }
}

export function makeInstruction(
  sourceId: string,
  target: Control,
  rng: Rng,
  deadline: number
): Instruction {
  const targetValue = pickTargetValue(target, rng);
  return {
    id: nextId(),
    sourceId,
    targetControlId: target.id,
    targetValue,
    text: instructionText(target, targetValue, rng),
    deadline,
  };
}

export function satisfies(ins: Instruction, control: Control, newValue: string): boolean {
  if (ins.targetControlId !== control.id) return false;
  if (control.type === "button") return true;
  return ins.targetValue === newValue;
}