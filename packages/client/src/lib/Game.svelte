<script lang="ts">
  import { S, me } from "./store.svelte";
  import Control from "./Control.svelte";

  let mine = $derived(me());
  let healthPct = $derived(Math.max(0, Math.min(100, S.health)));
  let floorPct = $derived(Math.max(0, Math.min(100, S.deathLimit)));
  let danger = $derived(S.health - S.deathLimit < 20);
</script>

<div class="game" class:flash-good={S.flash === "good"} class:flash-bad={S.flash === "bad"}>
  <header class="hud">
    <span class="sector">Sector {S.level}</span>
    <div class="bar" class:danger>
      <div class="floor" style="width:{floorPct}%"></div>
      <div class="health" style="width:{healthPct}%"></div>
    </div>
  </header>

  <section class="command">
    <div class="command-inner" class:pulse={S.flash === "good"}>
      {mine?.instructionText ?? "Stand by..."}
    </div>
  </section>

  <section class="panel">
    {#each mine?.panel ?? [] as c (c.id)}
      <Control control={c} />
    {/each}
  </section>
</div>

<style>
  .game { max-width: 560px; margin: 0 auto; padding: 12px 12px 40px; }
  .game.flash-good { box-shadow: inset 0 0 0 3px var(--ok); }
  .game.flash-bad { box-shadow: inset 0 0 0 3px var(--danger); }

  .hud { display: flex; align-items: center; gap: 12px; padding: 6px 2px 12px; }
  .sector {
    font-family: ui-monospace, Menlo, monospace; color: var(--muted);
    font-size: 0.85rem; white-space: nowrap;
  }
  .bar {
    position: relative; flex: 1; height: 18px; border-radius: 9px;
    background: #0c1a19; border: 1px solid var(--line); overflow: hidden;
  }
  .floor { position: absolute; inset: 0 auto 0 0; background: repeating-linear-gradient(45deg,#3a1414,#3a1414 6px,#511a1a 6px,#511a1a 12px); }
  .health { position: absolute; inset: 0 auto 0 0; background: var(--ok); transition: width 0.25s ease; }
  .bar.danger .health { background: var(--danger); }

  .command {
    margin: 8px 0 16px; padding: 22px 16px; text-align: center;
    background: var(--panel); border: 1px solid var(--amber);
    border-radius: var(--radius);
  }
  .command-inner {
    font-family: ui-monospace, Menlo, monospace;
    font-size: 1.5rem; line-height: 1.25; color: var(--amber); font-weight: 700;
  }
  .panel { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  @media (min-width: 520px) { .panel { grid-template-columns: repeat(3, 1fr); } }
</style>