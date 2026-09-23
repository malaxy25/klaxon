<script lang="ts">
  import { setControl, clearHazard, type ControlView } from "./store.svelte";
  let { control }: { control: ControlView } = $props();

  const press = () => setControl(control.id, "");
  const flip = () => setControl(control.id, control.value === "true" ? "false" : "true");
  const onSlide = (e: Event) => setControl(control.id, (e.target as HTMLInputElement).value);
  const choose = (opt: string) => setControl(control.id, opt);

  let ticks = $derived(
    control.kind === "slider"
      ? Array.from({ length: (control.max ?? 0) - (control.min ?? 0) + 1 }, (_, i) => (control.min ?? 0) + i)
      : []
  );

  // Hazard "broken": halten zum Reparieren
  let holdProg = $state(0);
  let holding = false; let raf = 0;
  const REPAIR_MS = 1500;
  function holdStart(e: PointerEvent) {
    if (control.hazard !== "broken") return; e.preventDefault(); holding = true;
    const t0 = performance.now();
    const step = () => {
      if (!holding) return;
      holdProg = Math.min(1, (performance.now() - t0) / REPAIR_MS);
      if (holdProg >= 1) { holding = false; holdProg = 0; clearHazard(control.id); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  function holdEnd() { holding = false; holdProg = 0; cancelAnimationFrame(raf); }

  // Hazard "slimed": wegwischen (Swipe)
  let wipeProg = $state(0);
  let wiping = false; let lx = 0, ly = 0;
  const WIPE_PX = 240;
  function wipeStart(e: PointerEvent) {
    if (control.hazard !== "slimed") return; e.preventDefault(); wiping = true; lx = e.clientX; ly = e.clientY;
  }
  function wipeMove(e: PointerEvent) {
    if (!wiping) return;
    wipeProg = Math.min(1, wipeProg + Math.hypot(e.clientX - lx, e.clientY - ly) / WIPE_PX);
    lx = e.clientX; ly = e.clientY;
    if (wipeProg >= 1) { wiping = false; wipeProg = 0; clearHazard(control.id); }
  }
  function wipeEnd() { wiping = false; wipeProg = 0; }
</script>

<div class="control kind-{control.kind}" class:hazarded={!!control.hazard}
     style="grid-column: span {control.w}; grid-row: span {control.h};">
  <div class="face">
    {#if control.kind === "button"}
      <button class="hw press" onclick={press}>PRESS</button>
    {:else if control.kind === "toggle"}
      <button class="switch" class:on={control.value === "true"} onclick={flip} aria-label="toggle"><span class="knob"></span></button>
    {:else if control.kind === "slider"}
      <div class="ticks">{#each ticks as t}<span>{t}</span>{/each}</div>
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

  {#if control.hazard === "broken"}
    <div class="hz hz-broken" onpointerdown={holdStart} onpointerup={holdEnd} onpointerleave={holdEnd} onpointercancel={holdEnd}>
      <div class="hz-label">HOLD<br />TO FIX</div>
      <div class="hz-bar"><div class="hz-fill" style="width:{holdProg * 100}%"></div></div>
    </div>
  {:else if control.hazard === "slimed"}
    <div class="hz hz-slimed" onpointerdown={wipeStart} onpointermove={wipeMove} onpointerup={wipeEnd} onpointerleave={wipeEnd} onpointercancel={wipeEnd}>
      <div class="hz-label">ALIEN GOO<br />WIPE IT OFF</div>
      <div class="hz-bar"><div class="hz-fill green" style="width:{wipeProg * 100}%"></div></div>
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
  .control.hazarded { filter: brightness(0.85); }

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
  .press { color: #fff; border: 1px solid #6b2020; border-radius: 999px; aspect-ratio: 1; max-width: 68px; margin: 0 auto; font-size: 0.8rem;
    background: radial-gradient(circle at 50% 32%, #ff7a7a 0%, #d23636 55%, #8f1c1c 100%);
    box-shadow: inset 0 -4px 8px rgba(0,0,0,0.5), inset 0 3px 6px rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.5); }
  .press:active { transform: translateY(1px); box-shadow: inset 0 2px 8px rgba(0,0,0,0.6), 0 0 14px rgba(229,72,77,0.7); }

  /* Toggle als Kippschalter */
  .switch { position: relative; height: 42px; width: 58px; margin: 2px auto; padding: 0; border-radius: 22px; cursor: pointer;
    background: linear-gradient(180deg,#0c1a19,#14302c); border: 1px solid var(--line); box-shadow: inset 0 2px 6px rgba(0,0,0,0.6); }
  .switch .knob { position: absolute; left: 5px; right: 5px; height: 16px; top: 22px; border-radius: 8px;
    background: linear-gradient(180deg,#95a5a2,#4a5b58); box-shadow: 0 1px 2px rgba(0,0,0,0.6); transition: top 0.12s ease, background 0.12s ease; }
  .switch.on { border-color: var(--amber); box-shadow: inset 0 2px 6px rgba(0,0,0,0.6), 0 0 12px rgba(245,166,35,0.5); }
  .switch.on .knob { top: 4px; background: linear-gradient(180deg,#ffd98a,#f5a623); }

  /* Slider mit Ticks */
  .ticks { display: flex; justify-content: space-between; padding: 0 2px; font-family: ui-monospace, Menlo, monospace; font-size: 0.6rem; color: var(--muted); }
  .range { width: 100%; accent-color: var(--amber); }
  .readout {
    align-self: center; font-family: ui-monospace, Menlo, monospace; color: var(--amber); font-size: 1.05rem;
    background: #0a1615; border: 1px solid var(--line); border-radius: 4px; padding: 1px 10px;
    box-shadow: inset 0 0 8px rgba(0,0,0,0.6); text-shadow: 0 0 6px rgba(245,166,35,0.6);
  }
  .opts { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
  .opts .hw { width: auto; flex: 1 1 42%; padding: 0.4em; font-size: 0.8rem;
    background: #0a1615; color: var(--muted); border: 1px solid var(--line); box-shadow: inset 0 0 6px rgba(0,0,0,0.6); }
  .opts .hw.on { background: linear-gradient(180deg,#ffc24d,#f5a623); color: var(--amber-ink); border-color: var(--amber); box-shadow: 0 0 12px rgba(245,166,35,0.6); }

  /* Hazard-Overlays */
  .hz { position: absolute; inset: 0; z-index: 3; touch-action: none; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; border-radius: 8px; }
  .hz-label { font-family: ui-monospace, Menlo, monospace; font-weight: 700; font-size: 0.78rem; text-align: center; line-height: 1.05; }
  .hz-bar { width: 72%; height: 6px; background: rgba(0,0,0,0.55); border-radius: 3px; overflow: hidden; }
  .hz-fill { height: 100%; background: var(--ok); }
  .hz-fill.green { background: #9be06a; }
  .hz-broken { border: 2px solid var(--danger);
    background: repeating-linear-gradient(45deg, rgba(229,72,77,0.18), rgba(229,72,77,0.18) 8px, rgba(0,0,0,0.4) 8px, rgba(0,0,0,0.4) 16px); }
  .hz-broken .hz-label { color: #ffd9d2; text-shadow: 0 0 6px rgba(229,72,77,0.9); }
  .hz-slimed { border: 2px solid #6fae3f;
    background: radial-gradient(circle at 28% 38%, rgba(140,215,95,0.65), transparent 42%), radial-gradient(circle at 72% 62%, rgba(95,185,70,0.6), transparent 46%), rgba(55,120,40,0.55); }
  .hz-slimed .hz-label { color: #eafce0; text-shadow: 0 0 6px rgba(60,140,40,0.9); }
</style>
