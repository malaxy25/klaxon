<script lang="ts">
  import { difficultyForLevel } from "@spaceteam/shared";
  import { S, me, toggleMute } from "./store.svelte";
  import Control from "./Control.svelte";

  let mine = $derived(me());
  let healthPct = $derived(Math.max(0, Math.min(100, S.health)));
  let floorPct = $derived(Math.max(0, Math.min(100, S.deathLimit)));
  let danger = $derived(S.health - S.deathLimit < 20);
  let cmdMs = $derived(difficultyForLevel(S.level).instructionTimeMs);
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
    {#key mine?.instructionText}
      <div class="command-inner" class:pulse={S.flash === "good"}>
        {mine?.instructionText ?? "Stand by..."}
      </div>
      <div class="timer"><div class="timer-fill" style="animation-duration: {cmdMs}ms"></div></div>
    {/key}
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
  .game { max-width: 720px; margin: 0 auto; padding: 12px 12px 40px; }
  .game.flash-good { box-shadow: inset 0 0 0 3px var(--ok); }
  .game.flash-bad { box-shadow: inset 0 0 0 3px var(--danger); }

  .hud { display: flex; align-items: center; gap: 12px; padding: 6px 2px 12px; }
  .sector { font-family: ui-monospace, Menlo, monospace; color: var(--muted); font-size: 0.85rem; white-space: nowrap; }
  .bar { position: relative; flex: 1; height: 18px; border-radius: 9px; background: #0c1a19; border: 1px solid var(--line); overflow: hidden; }
  .floor { position: absolute; inset: 0 auto 0 0; background: repeating-linear-gradient(45deg,#3a1414,#3a1414 6px,#511a1a 6px,#511a1a 12px); }
  .health { position: absolute; inset: 0 auto 0 0; background: var(--ok); transition: width 0.25s ease; }
  .bar.danger .health { background: var(--danger); }
  .mute { appearance: none; border: 1px solid var(--line); background: var(--panel-2); color: var(--muted); border-radius: 8px; padding: 0.35em 0.6em; font-size: 0.8rem; cursor: pointer; white-space: nowrap; }

  .command { margin: 8px 0 16px; padding: 18px 16px 14px; text-align: center; background: var(--panel); border: 1px solid var(--amber); border-radius: var(--radius); }
  .command-inner { font-family: ui-monospace, Menlo, monospace; font-size: 1.5rem; line-height: 1.25; color: var(--amber); font-weight: 700; }
  .timer { height: 4px; margin-top: 12px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
  .timer-fill { height: 100%; background: var(--amber); transform-origin: left center; transform: scaleX(1); }

  .panel { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); grid-auto-rows: 96px; grid-auto-flow: row dense; gap: 8px; }
  @media (min-width: 420px) { .panel { grid-template-columns: repeat(3, minmax(0,1fr)); } }
  @media (min-width: 620px) { .panel { grid-template-columns: repeat(4, minmax(0,1fr)); } }
  @media (min-width: 920px) { .panel { grid-template-columns: repeat(6, minmax(0,1fr)); } }

  .banner { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 20; }
  .banner span { font-family: ui-monospace, Menlo, monospace; font-size: 2rem; font-weight: 700; color: var(--amber); background: rgba(14,28,27,0.88); border: 1px solid var(--amber); padding: 0.5em 1em; border-radius: 12px; letter-spacing: 2px; }

  @media (prefers-reduced-motion: no-preference) {
    .game.shake { animation: shake 0.4s ease; }
    .banner span { animation: bannerpop 0.3s ease; }
    .timer-fill { animation-name: drain; animation-timing-function: linear; animation-fill-mode: forwards; }
  }
  @keyframes shake { 10%,90% { transform: translateX(-2px); } 20%,80% { transform: translateX(4px); } 30%,50%,70% { transform: translateX(-8px); } 40%,60% { transform: translateX(8px); } }
  @keyframes bannerpop { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes drain { from { transform: scaleX(1); } to { transform: scaleX(0); } }
</style>
