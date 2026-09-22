<script lang="ts">
  import { setControl, repairControl, type ControlView } from "./store.svelte";
  let { control }: { control: ControlView } = $props();

  const press = () => setControl(control.id, "");
  const flip = () => setControl(control.id, control.value === "true" ? "false" : "true");
  const onSlide = (e: Event) => setControl(control.id, (e.target as HTMLInputElement).value);
  const choose = (opt: string) => setControl(control.id, opt);

  let prog = $state(0);
  let holding = false;
  let raf = 0;
  const REPAIR_MS = 1500;
  function startHold(e: PointerEvent) {
    if (!control.broken) return;
    e.preventDefault();
    holding = true;
    const t0 = performance.now();
    const step = () => {
      if (!holding) return;
      prog = Math.min(1, (performance.now() - t0) / REPAIR_MS);
      if (prog >= 1) { holding = false; prog = 0; repairControl(control.id); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  function endHold() { holding = false; prog = 0; cancelAnimationFrame(raf); }
</script>

<div class="control kind-{control.kind}" class:broken={control.broken}
     style="grid-column: span {control.w}; grid-row: span {control.h};">
  <div class="face">
    {#if control.kind === "button"}
      <button class="hw press" onclick={press}>PRESS</button>
    {:else if control.kind === "toggle"}
      <button class="hw toggle" class:on={control.value === "true"} onclick={flip}>{control.value === "true" ? "ON" : "OFF"}</button>
    {:else if control.kind === "slider"}
      <input class="range" type="range" min={control.min} max={control.max} step="1" value={control.value} oninput={onSlide} />
      <div class="readout">{control.value}</div>
    {:else if control.kind === "selector"}
      <div class="opts">
        {#each control.options as opt}
          <button class="hw opt" class:on={control.value === opt} onclick={() => choose(opt)}>{opt}</button>
        {/each}
      </div>
    {/if}
  </div>
  <div class="name">{control.label}</div>

  {#if control.broken}
    <div class="broken-overlay" onpointerdown={startHold} onpointerup={endHold} onpointerleave={endHold} onpointercancel={endHold}>
      <div class="fix">HOLD<br />TO FIX</div>
      <div class="fixbar"><div class="fixfill" style="width:{prog * 100}%"></div></div>
    </div>
  {/if}
</div>

<style>
  .control {
    position: relative; height: 100%; min-height: 0; overflow: hidden;
    display: flex; flex-direction: column; justify-content: center; gap: 5px;
    padding: 7px 8px 6px; border-radius: 8px;
    background: linear-gradient(180deg, #1a3d38 0%, #12302c 100%);
    border: 1px solid var(--line); border-top-width: 3px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -6px 12px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.4);
  }
  .control::after {
    content: ""; position: absolute; inset: 4px; pointer-events: none; border-radius: 6px;
    background:
      radial-gradient(circle at 2px 2px, rgba(255,255,255,0.22) 0.5px, transparent 1.6px),
      radial-gradient(circle at calc(100% - 2px) 2px, rgba(255,255,255,0.22) 0.5px, transparent 1.6px),
      radial-gradient(circle at 2px calc(100% - 2px), rgba(255,255,255,0.22) 0.5px, transparent 1.6px),
      radial-gradient(circle at calc(100% - 2px) calc(100% - 2px), rgba(255,255,255,0.22) 0.5px, transparent 1.6px);
  }
  .kind-button   { border-top-color: var(--danger); }
  .kind-toggle   { border-top-color: var(--ok); }
  .kind-slider   { border-top-color: var(--amber); }
  .kind-selector { border-top-color: #7cc4e8; }
  .control.broken { filter: grayscale(0.5) brightness(0.72); }

  .face { display: flex; flex-direction: column; justify-content: center; gap: 5px; min-height: 0; }
  .name {
    font-size: 0.68rem; color: var(--muted); text-align: center; line-height: 1.1; letter-spacing: 0.3px;
    overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }
  .hw {
    appearance: none; cursor: pointer; width: 100%;
    border: 1px solid var(--line); background: linear-gradient(180deg,#25514a,#1a3d38); color: var(--ink);
    border-radius: 7px; padding: 0.5em; font-weight: 700; font-size: 0.9rem;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.4);
  }
  .hw:active { transform: translateY(1px); }
  .hw.on { background: linear-gradient(180deg,#ffc24d,#f5a623); color: var(--amber-ink); border-color: var(--amber); box-shadow: 0 0 12px rgba(245,166,35,0.6); }
  .press { background: linear-gradient(180deg,#5a1c1c,#3a1414); border-color: #6b2020; color: #ffd9d2; }
  .press:active { box-shadow: 0 0 12px rgba(229,72,77,0.6); }
  .range { width: 100%; accent-color: var(--amber); }
  .readout {
    align-self: center; font-family: ui-monospace, Menlo, monospace; color: var(--amber); font-size: 1.05rem;
    background: #0a1615; border: 1px solid var(--line); border-radius: 4px; padding: 1px 10px;
    box-shadow: inset 0 0 8px rgba(0,0,0,0.6); text-shadow: 0 0 6px rgba(245,166,35,0.6);
  }
  .opts { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
  .opts .hw { width: auto; flex: 1 1 42%; padding: 0.4em; font-size: 0.8rem; }

  .broken-overlay {
    position: absolute; inset: 0; z-index: 3; touch-action: none; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px;
    border: 2px solid var(--danger); border-radius: 8px;
    background: repeating-linear-gradient(45deg, rgba(229,72,77,0.18), rgba(229,72,77,0.18) 8px, rgba(0,0,0,0.4) 8px, rgba(0,0,0,0.4) 16px);
  }
  .broken-overlay .fix { font-family: ui-monospace, Menlo, monospace; font-weight: 700; color: #ffd9d2; font-size: 0.8rem; text-align: center; line-height: 1.05; text-shadow: 0 0 6px rgba(229,72,77,0.9); }
  .fixbar { width: 72%; height: 6px; background: rgba(0,0,0,0.55); border-radius: 3px; overflow: hidden; }
  .fixfill { height: 100%; background: var(--ok); }
</style>
