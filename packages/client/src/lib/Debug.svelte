<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { S, me, dbg } from "./store.svelte";

  let open = $state(false);
  let reveal = $state(false);
  let paused = $state(false);
  let statsTimer: ReturnType<typeof setInterval> | undefined;

  const EVENTS = ["meteor", "blackhole", "brace", "surge", "freeze", "wormhole"];
  let mine = $derived(me());

  function refreshStats() { dbg("debug:stats"); }
  onMount(() => { refreshStats(); statsTimer = setInterval(() => { if (open) refreshStats(); }, 3000); });
  onDestroy(() => clearInterval(statsTimer));

  function toggleReveal() { reveal = !reveal; dbg("debug:reveal", reveal); }
  function togglePause() { paused = !paused; dbg("debug:pause", paused); }

  // Antwort auf mein aktuelles Kommando (nur wenn reveal an)
  let answer = $derived.by(() => {
    const id = mine?.dbgTargetControlId;
    if (!id) return "";
    const c = mine?.panel.find((x) => x.id === id);
    const label = c ? c.label : id;
    const v = mine?.dbgTargetValue;
    if (c?.kind === "toggle") return label + " -> " + (v === "true" ? "ON" : "OFF");
    if (c?.kind === "button") return label + " -> PRESS";
    return label + " -> " + v;
  });

  function fmtUptime(sec: number) {
    if (sec == null) return "-";
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + "h " : "") + (m ? m + "m " : "") + s + "s";
  }
</script>

{#if !open}
  <button class="dbg-fab" onclick={() => { open = true; refreshStats(); }}>DEBUG</button>
{:else}
  <div class="dbg-panel">
    <div class="dbg-head">
      <span>DEBUG</span>
      <button class="dbg-x" onclick={() => (open = false)}>close</button>
    </div>

    {#if !mine?.host}
      <p class="dbg-note">Only the host can trigger debug actions. (Stats still shown.)</p>
    {/if}

    <div class="dbg-sec">
      <div class="dbg-t">Server stats</div>
      {#if S.stats}
        {#if S.stats.error}
          <div class="dbg-note">error: {S.stats.error}</div>
        {:else}
          <div class="dbg-grid">
            <span>Rooms</span><b>{S.stats.rooms}</b>
            <span>Players</span><b>{S.stats.players}</b>
            <span>Uptime</span><b>{fmtUptime(S.stats.uptime)}</b>
            <span>RSS</span><b>{S.stats.rssMB} MB</b>
            <span>Heap</span><b>{S.stats.heapMB} MB</b>
          </div>
        {/if}
      {:else}
        <div class="dbg-note">loading...</div>
      {/if}
      <button class="dbg-b" onclick={refreshStats}>Refresh</button>
    </div>

    {#if mine?.host}
      <div class="dbg-sec">
        <div class="dbg-t">Trigger event</div>
        <div class="dbg-row">
          {#each EVENTS as e}<button class="dbg-b" onclick={() => dbg("debug:event", e)}>{e}</button>{/each}
        </div>
      </div>

      <div class="dbg-sec">
        <div class="dbg-t">Hazards</div>
        <div class="dbg-row">
          <button class="dbg-b" onclick={() => dbg("debug:hazard", "broken")}>Break</button>
          <button class="dbg-b" onclick={() => dbg("debug:hazard", "slimed")}>Slime</button>
          <button class="dbg-b" onclick={() => dbg("debug:clearHazards")}>Clear</button>
        </div>
      </div>

      <div class="dbg-sec">
        <div class="dbg-t">Health / flow</div>
        <div class="dbg-row">
          <button class="dbg-b" onclick={() => dbg("debug:health", -20)}>-20 hp</button>
          <button class="dbg-b" onclick={() => dbg("debug:health", 20)}>+20 hp</button>
          <button class="dbg-b" onclick={() => dbg("debug:nextLevel")}>Next sector</button>
          <button class="dbg-b" onclick={() => dbg("debug:gameOver")}>Game over</button>
        </div>
      </div>

      <div class="dbg-sec">
        <div class="dbg-t">Solve / start</div>
        <div class="dbg-row">
          <button class="dbg-b" onclick={() => dbg("debug:solve", false)}>Solve mine</button>
          <button class="dbg-b" onclick={() => dbg("debug:solve", true)}>Solve all</button>
          <button class="dbg-b" onclick={() => dbg("debug:forceStart")}>Force start</button>
        </div>
      </div>

      <div class="dbg-sec">
        <div class="dbg-t">Toggles</div>
        <div class="dbg-row">
          <button class="dbg-b" class:on={reveal} onclick={toggleReveal}>Reveal answers</button>
          <button class="dbg-b" class:on={paused} onclick={togglePause}>Pause</button>
        </div>
        {#if reveal && answer}<div class="dbg-answer">Your command: {answer}</div>{/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .dbg-fab { position: fixed; right: 8px; bottom: 8px; z-index: 60; font-family: ui-monospace, Menlo, monospace; font-size: 0.7rem;
    background: #2a1030; color: #e9b7ff; border: 1px solid #7a3d94; border-radius: 8px; padding: 6px 9px; opacity: 0.85; touch-action: manipulation; }
  .dbg-panel { position: fixed; right: 8px; bottom: 8px; z-index: 60; width: min(320px, 92vw); max-height: 80dvh; overflow: auto;
    background: rgba(20,10,26,0.97); border: 1px solid #7a3d94; border-radius: 12px; padding: 10px; color: #f0e6f6;
    font-family: ui-monospace, Menlo, monospace; font-size: 0.72rem; box-shadow: 0 6px 24px rgba(0,0,0,0.5); }
  .dbg-head { display: flex; justify-content: space-between; align-items: center; font-weight: 700; letter-spacing: 2px; color: #e9b7ff; margin-bottom: 6px; }
  .dbg-x { background: transparent; border: 1px solid #7a3d94; color: #e9b7ff; border-radius: 6px; padding: 2px 8px; touch-action: manipulation; }
  .dbg-note { color: #b79ac6; margin: 2px 0; }
  .dbg-sec { border-top: 1px solid #3d2247; padding: 7px 0 3px; }
  .dbg-t { color: #c98fe0; margin-bottom: 5px; letter-spacing: 1px; }
  .dbg-row { display: flex; flex-wrap: wrap; gap: 5px; }
  .dbg-b { background: #34184000; border: 1px solid #7a3d94; color: #f0e6f6; border-radius: 7px; padding: 6px 8px; cursor: pointer; touch-action: manipulation; }
  .dbg-b:active { transform: translateY(1px); }
  .dbg-b.on { background: #6a2b86; border-color: #b06fd0; }
  .dbg-grid { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin-bottom: 6px; }
  .dbg-grid b { justify-self: end; }
  .dbg-answer { margin-top: 6px; color: #9be06a; }
</style>
