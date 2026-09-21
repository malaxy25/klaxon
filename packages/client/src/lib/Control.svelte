<script lang="ts">
  import { setControl, type ControlView } from "./store.svelte";
  let { control }: { control: ControlView } = $props();

  const press = () => setControl(control.id, "");
  const flip = () => setControl(control.id, control.value === "true" ? "false" : "true");
  const onSlide = (e: Event) => setControl(control.id, (e.target as HTMLInputElement).value);
  const choose = (opt: string) => setControl(control.id, opt);
</script>

<div class="control kind-{control.kind}"
     style="grid-column: span {control.w}; grid-row: span {control.h};">
  <div class="face">
    {#if control.kind === "button"}
      <button class="hw press" onclick={press}>PRESS</button>
    {:else if control.kind === "toggle"}
      <button class="hw toggle" class:on={control.value === "true"} onclick={flip}>
        {control.value === "true" ? "ON" : "OFF"}
      </button>
    {:else if control.kind === "slider"}
      <input class="range" type="range" min={control.min} max={control.max} step="1"
             value={control.value} oninput={onSlide} />
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
</div>

<style>
  .control {
    background: var(--panel); border: 1px solid var(--line);
    border-top-width: 3px;
    border-radius: var(--radius); padding: 8px;
    display: flex; flex-direction: column; justify-content: center; gap: 6px;
    height: 100%; min-height: 0; overflow: hidden;
  }
  .kind-button   { border-top-color: var(--danger); }
  .kind-toggle   { border-top-color: var(--ok); }
  .kind-slider   { border-top-color: var(--amber); }
  .kind-selector { border-top-color: #7cc4e8; }

  .face { display: flex; flex-direction: column; justify-content: center; gap: 6px; min-height: 0; }
  .name {
    font-size: 0.72rem; color: var(--muted); text-align: center; line-height: 1.15;
    overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }
  .hw {
    appearance: none; cursor: pointer; width: 100%;
    border: 1px solid var(--line); background: var(--panel-2); color: var(--ink);
    border-radius: 8px; padding: 0.55em; font-weight: 700; font-size: 0.9rem;
  }
  .hw:active { transform: translateY(1px); }
  .hw.on { background: var(--amber); color: var(--amber-ink); border-color: var(--amber); }
  .press { background: #3a1414; border-color: #6b2020; color: #ffd9d2; }
  .range { width: 100%; accent-color: var(--amber); }
  .readout { font-family: ui-monospace, Menlo, monospace; text-align: center; color: var(--amber); font-size: 1.05rem; }
  .opts { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; }
  .opts .hw { width: auto; flex: 1 1 42%; padding: 0.4em; font-size: 0.8rem; }
</style>
