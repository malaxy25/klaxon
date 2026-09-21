<script lang="ts">
  import { S, me, toggleMute } from "./store.svelte";
  import Control from "./Control.svelte";

  let mine = $derived(me());
  let healthPct = $derived(Math.max(0, Math.min(100, S.health)));
  let floorPct = $derived(Math.max(0, Math.min(100, S.deathLimit)));
  let danger = $derived(S.health - S.deathLimit < 20);
</script>

<div class="game" class:flash-good={S.flash === "good"} class:flash-bad={S.flash === "bad"} class:shake={S.shake}>
  <header class="hud">
    <span class="sector">Sector {S.level}</span>
    <div class="bar" class:danger>
      <div class="floor" style="width:{floorPct}%"></div>
      <div class="health" style="width:{healthPct}%"></div>
    </div>
    <button class="mute" onclick={toggleMute} aria-label="Toggle sound">
      {S.muted ? "unmute" : "mute"}
    </button>
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

  {#if S.banner}
    <div class="banner"><span>{S.banner}</span></div>
  {/if}
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
  .mute {
    appearance: none; border: 1px solid var(--line); background: var(--panel-2);
    color: var(--muted); border-radius: 8px; padding: 0.35em 0.6em;
    font-size: 0.8rem; cursor: pointer; white-space: nowrap;
  }

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

  .banner {
    position: fixed; inset: 0; display: flex; align-items: center;
    justify-content: center; pointer-events: none; z-index: 20;
  }
  .banner span {
    font-family: ui-monospace, Menlo, monospace; font-size: 2rem; font-weight: 700;
    color: var(--amber); background: rgba(14, 28, 27, 0.88);
    border: 1px solid var(--amber); padding: 0.5em 1em; border-radius: 12px;
    letter-spacing: 2px;
  }

  @media (prefers-reduced-motion: no-preference) {
    .game.shake { animation: shake 0.4s ease; }
    .banner span { animation: bannerpop 0.3s ease; }
  }
  @keyframes shake {
    10%, 90% { transform: translateX(-2px); }
    20%, 80% { transform: translateX(4px); }
    30%, 50%, 70% { transform: translateX(-8px); }
    40%, 60% { transform: translateX(8px); }
  }
  @keyframes bannerpop {
    from { transform: scale(0.7); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
</style>
