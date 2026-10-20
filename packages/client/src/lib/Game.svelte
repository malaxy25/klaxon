<script lang="ts">
  import { difficultyForLevel } from "@klaxon/shared";
  import { S, me, toggleMute } from "./store.svelte";
  import Control from "./Control.svelte";
  import Coach from "./Coach.svelte";

  let mine = $derived(me());
  let marginPct = $derived(Math.max(0, Math.min(100, ((S.health - S.deathLimit) / Math.max(1, 100 - S.deathLimit)) * 100)));
  let danger = $derived(S.health - S.deathLimit < 20);
  let cmdMs = $derived(S.tutorial ? S.cmdMs : difficultyForLevel(S.level).instructionTimeMs);
  let alarm = $derived(!S.tutorial && S.health - S.deathLimit < 15);

  // HUD im LED-Look: dunkle "8"-Segmente hinter den leuchtenden Ziffern
  const pad = (n: number) => String(n).padStart(2, "0");
  let ledText = $derived(S.tutorial ? `${pad(S.tutStep)}/${pad(S.tutTotal)}` : pad(S.level));
  let ledGhost = $derived(ledText.replace(/\d/g, "8"));
  // Warp-Streifen: schneller je Sektor
  let warpDur = $derived(Math.max(0.8, 4 - S.level * 0.3));

  // Neuer Befehl tippt sich ein (Terminal-Look); reduzierte Bewegung = sofort
  // nur am Text haengen (nicht am Spielerobjekt, das sich bei jedem Server-Update aendert)
  let cmd = $derived(mine?.instructionText ?? "");
  let full = $derived(cmd || "Stand by...");
  let typed = $state("");
  let typing = $state(false);
  $effect(() => {
    const text = full;
    let reduce = false;
    try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* ignore */ }
    if (reduce || !cmd) { typed = text; typing = false; return; }
    typed = ""; typing = true;
    const t0 = performance.now(), dur = Math.min(450, 18 * text.length);
    let raf = 0;
    const step = () => {
      const n = Math.ceil(text.length * Math.min(1, (performance.now() - t0) / dur));
      typed = text.slice(0, n);
      if (n < text.length) raf = requestAnimationFrame(step); else typing = false;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  });
</script>

<div class="game" class:flash-good={S.flash === "good"} class:flash-bad={S.flash === "bad"} class:shake={S.shake}>
  <header class="hud">
    <div class="warp" class:red={alarm} style="--warp-dur:{warpDur}s" aria-hidden="true"></div>
    {#if alarm}<span class="beacon" aria-hidden="true"></span>{/if}
    <span class="led" aria-label={S.tutorial ? `Training step ${S.tutStep} of ${S.tutTotal}` : `Sector ${S.level}`}>
      <span class="led-lbl">{S.tutorial ? "TRAINING" : "SECTOR"}</span>
      <span class="led-num"><span class="led-ghost">{ledGhost}</span><span class="led-on">{ledText}</span></span>
    </span>
    <div class="bar" class:danger>
      <div class="health" style="width:{marginPct}%"></div>
    </div>
    <button class="mute" onclick={toggleMute} aria-label="Toggle sound">{S.muted ? "unmute" : "mute"}</button>
    <button class="mute" onclick={() => (location.href = location.pathname)} aria-label="Leave game">leave</button>
  </header>

  <section class="command">
    {#key mine?.instructionText}
      <div class="command-inner" class:pulse={S.flash === "good"}>
        <span class="cmd-ghost" aria-hidden="true">{full}<i class="cursor"></i></span>
        <span class="cmd-typed">{typed}<i class="cursor" class:typing></i></span>
      </div>
      {#if cmdMs > 0}<div class="timer"><div class="timer-fill" style="animation-duration: {cmdMs}ms"></div></div>{/if}
    {/key}
  </section>

  {#if S.tutorial}<Coach />{/if}

  <section class="panel">
    {#each mine?.panel ?? [] as c (c.id)}
      <Control control={c} highlight={c.id === mine?.hlControlId} />
    {/each}
  </section>

  {#if S.banner}<div class="banner"><span>{S.banner}</span></div>{/if}
</div>

{#if S.toast}<div class="toast">{S.toast}</div>{/if}

{#if S.crack}
  <!-- Riss im "Glas" bei Schaden: eine Form, drei Positionen -->
  <svg class="crack" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <g transform={S.crack === 1 ? "translate(0 0)" : S.crack === 2 ? "translate(100 22) scale(-1 1)" : "translate(18 46)"}>
      {#each ["shadow", "line"] as cls}
        <g class={cls}>
          <path d="M22 30 L12 19 L6 9 L3 2" /><path d="M22 30 L34 23 L47 25 L58 15 L70 12" />
          <path d="M22 30 L27 44 L23 57 L30 71" /><path d="M22 30 L11 38 L1 42" />
          <path d="M34 23 L37 11" /><path d="M27 44 L39 50 L45 62" /><path d="M20 27 L24 29 L22 33 L18 31 Z" />
        </g>
      {/each}
    </g>
  </svg>
{/if}

<style>
  .game {
    position: relative;
    height: 100vh; height: 100dvh;
    max-width: 720px; margin: 0 auto;
    display: flex; flex-direction: column; gap: 6px;
    padding: calc(6px + env(safe-area-inset-top, 0px)) calc(8px + env(safe-area-inset-right, 0px)) calc(8px + env(safe-area-inset-bottom, 0px)) calc(8px + env(safe-area-inset-left, 0px));
    overflow: hidden;
  }
  .game.flash-good { box-shadow: inset 0 0 40px rgba(87,192,138,0.35); }
  .game.flash-bad { box-shadow: inset 0 0 70px rgba(229,72,77,0.55); }
  .toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(18px + env(safe-area-inset-bottom, 0px)); z-index: 46; background: rgba(20,32,30,0.96); border: 1px solid var(--line); color: var(--ink); padding: 10px 16px; border-radius: 999px; font-size: 0.9rem; max-width: 92%; text-align: center; box-shadow: 0 6px 24px rgba(0,0,0,0.45); animation: toastin 0.2s ease-out; }
  @keyframes toastin { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
  .game::after { content:""; position:absolute; inset:0; pointer-events:none; z-index:5;
    background: repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0 1px, transparent 1px 3px), radial-gradient(120% 80% at 50% 28%, transparent 62%, rgba(0,0,0,0.34) 100%); }

  .hud { flex: none; position: relative; display: flex; align-items: center; gap: 10px; padding: 2px 4px; border-radius: 8px; overflow: hidden; background: #071110; }
  .hud > :not(.warp) { position: relative; z-index: 1; }

  /* Warp-Streifen: Sterne ziehen hinter dem HUD vorbei, rot bei Alarm */
  .warp { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.55; --star: rgba(207,230,255,0.9);
    background-image:
      radial-gradient(1px 1px at 8% 30%, var(--star), transparent), radial-gradient(1.4px 1.4px at 27% 72%, var(--star), transparent),
      radial-gradient(1px 1px at 46% 18%, var(--star), transparent), radial-gradient(1.6px 1px at 63% 58%, var(--star), transparent),
      radial-gradient(1px 1px at 81% 84%, var(--star), transparent), radial-gradient(1.2px 1px at 94% 40%, var(--star), transparent);
    background-size: 140px 100%; }
  .warp.red { --star: rgba(255,110,110,0.95); opacity: 0.75; }

  /* Rotes Warnlicht bei Alarm */
  .beacon { flex: none; width: 12px; height: 12px; border-radius: 50%; background: #e5484d; box-shadow: 0 0 8px 2px rgba(229,72,77,0.8); }

  /* LED-Anzeige */
  .led { flex: none; display: flex; align-items: center; gap: 6px; white-space: nowrap; background: #050b0a; border: 1px solid var(--line); border-radius: 6px; padding: 2px 8px; box-shadow: inset 0 0 8px rgba(0,0,0,0.7); }
  .led-lbl { font-family: ui-monospace, Menlo, monospace; font-size: 0.55rem; letter-spacing: 1.5px; color: var(--muted); }
  .led-num { position: relative; display: inline-block; font-family: ui-monospace, Menlo, monospace; font-weight: 700; font-style: italic; font-size: 0.95rem; letter-spacing: 2px; line-height: 1.1; }
  .led-ghost { color: rgba(245,166,35,0.12); }
  .led-on { position: absolute; inset: 0; color: var(--amber); text-shadow: 0 0 6px rgba(245,166,35,0.7); }
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
  .command-inner { display: inline-grid; text-align: left; font-family: ui-monospace, Menlo, monospace; font-size: 1.2rem; line-height: 1.15; color: var(--amber); font-weight: 700; text-shadow: 0 0 8px rgba(245,166,35,0.45); }
  /* Platzhalter haelt die volle Hoehe, damit das Panel beim Eintippen nicht springt */
  .cmd-ghost, .cmd-typed { grid-area: 1 / 1; }
  .cmd-ghost { visibility: hidden; }
  .cmd-ghost::before, .cmd-typed::before { content: "\25B6\00a0"; opacity: 0.85; }
  .cursor { display: inline-block; width: 0.5em; height: 0.95em; margin-left: 2px; vertical-align: -0.12em; background: var(--amber); box-shadow: 0 0 6px rgba(245,166,35,0.7); }

  /* Riss-Overlay */
  .crack { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 30; pointer-events: none; }
  .crack path { fill: none; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
  .crack .shadow path { stroke: rgba(0,0,0,0.55); stroke-width: 4px; }
  .crack .line path { stroke: rgba(235,245,255,0.85); stroke-width: 1.5px; }
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
    .warp { animation: warpdrift var(--warp-dur) linear infinite; }
    .beacon { animation: beacon 0.9s ease-in-out infinite; }
    .cursor:not(.typing) { animation: curblink 1s steps(1) infinite; }
    .crack { animation: crackfade 0.9s ease-out forwards; }
  }
  @keyframes warpdrift { from { background-position: 0 0; } to { background-position: -140px 0; } }
  @keyframes beacon { 0%,100% { opacity: 1; box-shadow: 0 0 10px 3px rgba(229,72,77,0.9); } 50% { opacity: 0.35; box-shadow: 0 0 2px 0 rgba(229,72,77,0.4); } }
  @keyframes curblink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
  @keyframes crackfade { 0% { opacity: 0; } 8% { opacity: 1; } 65% { opacity: 1; } 100% { opacity: 0; } }
  @keyframes shake { 10%,90%{transform:translateX(-2px)} 20%,80%{transform:translateX(4px)} 30%,50%,70%{transform:translateX(-9px)} 40%,60%{transform:translateX(9px)} }
  @keyframes bannerpop { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes drain { from{transform:scaleX(1)} to{transform:scaleX(0)} }
</style>
