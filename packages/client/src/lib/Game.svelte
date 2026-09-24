<script lang="ts">
  import { difficultyForLevel } from "@spaceteam/shared";
  import { S, me, toggleMute } from "./store.svelte";
  import Control from "./Control.svelte";

  let mine = $derived(me());
  let marginPct = $derived(Math.max(0, Math.min(100, ((S.health - S.deathLimit) / Math.max(1, 100 - S.deathLimit)) * 100)));
  let danger = $derived(S.health - S.deathLimit < 20);
  let cmdMs = $derived(difficultyForLevel(S.level).instructionTimeMs);
</script>

<div class="game" class:flash-good={S.flash === "good"} class:flash-bad={S.flash === "bad"} class:shake={S.shake}>
  <header class="hud">
    <span class="sector">SECTOR {S.level}</span>
    <div class="bar" class:danger>
      <div class="health" style="width:{marginPct}%"></div>
    </div>
    <button class="mute" onclick={toggleMute} aria-label="Toggle sound">{S.muted ? "unmute" : "mute"}</button>
  </header>

  <section class="command">
    {#key mine?.instructionText}
      <div class="command-inner" class:pulse={S.flash === "good"}>{mine?.instructionText ?? "Stand by..."}</div>
      <div class="timer"><div class="timer-fill" style="animation-duration: {cmdMs}ms"></div></div>
    {/key}
  </section>

  <section class="panel">
    {#each mine?.panel ?? [] as c (c.id)}
      <Control control={c} />
    {/each}
  </section>

  {#if S.banner}<div class="banner"><span>{S.banner}</span></div>{/if}
</div>

<style>
  .game {
    height: 100vh; height: 100dvh;
    max-width: 720px; margin: 0 auto;
    display: flex; flex-direction: column; gap: 6px;
    padding: 6px 8px 8px; overflow: hidden;
  }
  .game.flash-good { box-shadow: inset 0 0 40px rgba(87,192,138,0.35); }
  .game.flash-bad { box-shadow: inset 0 0 70px rgba(229,72,77,0.55); }

  .hud { flex: none; display: flex; align-items: center; gap: 10px; }
  .sector { font-family: ui-monospace, Menlo, monospace; color: var(--muted); font-size: 0.8rem; letter-spacing: 1px; white-space: nowrap; }
  .bar { position: relative; flex: 1; height: 16px; border-radius: 8px; background: #0a1615; border: 1px solid var(--line); overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.6); }
  .health { position: absolute; inset: 0 auto 0 0; background: linear-gradient(180deg,#6fe0a8,#3f9e6f); transition: width 0.25s ease; }
  .bar.danger .health { background: linear-gradient(180deg,#ff7a7f,#d13a3a); }
  .mute { flex: none; appearance: none; border: 1px solid var(--line); background: var(--panel-2); color: var(--muted); border-radius: 8px; padding: 0.3em 0.6em; font-size: 0.75rem; cursor: pointer; }

  .command {
    flex: none; text-align: center; padding: 8px 12px 7px;
    background: linear-gradient(180deg,#123230,#0e2420);
    border: 1px solid var(--amber); border-radius: 10px;
    box-shadow: inset 0 0 22px rgba(245,166,35,0.12), 0 2px 6px rgba(0,0,0,0.4);
    position: relative; overflow: hidden;
  }
  .command::after { content:""; position:absolute; inset:0; pointer-events:none; border-radius:10px; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.13) 0 1px, transparent 1px 3px); }
  .command-inner { font-family: ui-monospace, Menlo, monospace; font-size: 1.2rem; line-height: 1.15; color: var(--amber); font-weight: 700; text-shadow: 0 0 8px rgba(245,166,35,0.45); }
  .command-inner::before { content: "\25B6\00a0"; opacity: 0.85; }
  .timer { height: 4px; margin-top: 10px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
  .timer-fill { height: 100%; background: var(--amber); transform-origin: left center; transform: scaleX(1); box-shadow: 0 0 8px rgba(245,166,35,0.6); }

  .panel { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); grid-auto-rows: minmax(0, 1fr); grid-auto-flow: row dense; gap: 4px;
    padding: 3px; border-radius: 10px; background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.2));
    box-shadow: inset 0 0 0 1px var(--line), inset 0 2px 10px rgba(0,0,0,0.4); }
  @media (max-height: 720px) {
    .game { gap: 4px; padding: 4px 8px 6px; }
    .command { padding: 6px 10px 5px; }
    .command-inner { font-size: 1.05rem; }
    .panel { gap: 3px; padding: 2px; }
  }
  @media (min-width: 560px) { .panel { grid-template-columns: repeat(3, minmax(0,1fr)); } }
  @media (min-width: 820px) { .panel { grid-template-columns: repeat(4, minmax(0,1fr)); } }

  .banner { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 20; }
  .banner span { font-family: ui-monospace, Menlo, monospace; font-size: 2rem; font-weight: 700; color: var(--amber); background: rgba(14,28,27,0.9); border: 1px solid var(--amber); padding: 0.5em 1em; border-radius: 12px; letter-spacing: 2px; text-shadow: 0 0 10px rgba(245,166,35,0.5); }

  @media (prefers-reduced-motion: no-preference) {
    .game.shake { animation: shake 0.4s ease; }
    .banner span { animation: bannerpop 0.3s ease; }
    .timer-fill { animation-name: drain; animation-timing-function: linear; animation-fill-mode: forwards; }
  }
  @keyframes shake { 10%,90%{transform:translateX(-2px)} 20%,80%{transform:translateX(4px)} 30%,50%,70%{transform:translateX(-9px)} 40%,60%{transform:translateX(9px)} }
  @keyframes bannerpop { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes drain { from{transform:scaleX(1)} to{transform:scaleX(0)} }
</style>
