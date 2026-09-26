<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { S, sendContinue } from "./store.svelte";
  let secs = $state(Math.ceil((S.intermissionMs || 8000) / 1000));
  let timer: ReturnType<typeof setInterval>;
  let line = $state("");
  function pickLine(): string {
    const ps = S.players.filter((p) => p.connected);
    if (ps.length === 0) return "";
    const names = ps.map((p) => p.name);
    const rnd = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const top = [...ps].sort((a, b) => b.statCompleted - a.statCompleted)[0];
    const low = [...ps].sort((a, b) => a.statExpired - b.statExpired)[ps.length - 1];
    const t = [
      top.name + " is carrying the crew",
      top.name + " smashed the most orders",
      "Nice flying, " + rnd(names),
      "The hull held. Barely. Good job " + rnd(names),
      rnd(names) + " and " + rnd(names) + " make a chaotic team",
      "Somebody tell " + (low ? low.name : rnd(names)) + " to read faster",
      "Captain " + rnd(names) + " approves this jump",
    ];
    return rnd(t);
  }
  onMount(() => { line = pickLine(); timer = setInterval(() => { secs = Math.max(0, secs - 1); }, 1000); });
  onDestroy(() => clearInterval(timer));
</script>

<div class="sector-overlay" onpointerdown={sendContinue} role="button" tabindex="0">
  <div class="warp"></div>
  <div class="warp2"></div>
  <div class="sc-box">
    <div class="sc-sub">SECTOR {S.level} CLEARED</div>
    {#if line}<div class="sc-flavor">{line}</div>{/if}
    <div class="sc-title">WARP TO SECTOR {S.level + 1}</div>
    <div class="sc-tap">TAP TO CONTINUE</div>
    <div class="sc-count">{secs}s</div>
  </div>
</div>

<style>
  .sector-overlay {
    position: fixed; inset: 0; z-index: 45; overflow: hidden; cursor: pointer;
    display: flex; align-items: center; justify-content: center; text-align: center;
    background: radial-gradient(120% 90% at 50% 50%, #0b1a24 0%, #05090d 70%);
    -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
  }
  .warp {
    position: absolute; inset: -30%; pointer-events: none; will-change: transform;
    background:
      radial-gradient(circle at 50% 50%, rgba(124,196,232,0.22), transparent 60%),
      repeating-linear-gradient(90deg, transparent 0 30px, rgba(180,220,255,0.16) 30px 33px);
    animation: warpmove 0.45s linear infinite;
  }
  @keyframes warpmove { from { transform: translateX(0); } to { transform: translateX(-33px); } }
  .warp2 {
    position: absolute; inset: 0; pointer-events: none; will-change: transform, opacity;
    background:
      radial-gradient(2.5px 2.5px at 20% 30%, #fff, transparent),
      radial-gradient(2.5px 2.5px at 70% 60%, #cfe6ff, transparent),
      radial-gradient(2.5px 2.5px at 40% 80%, #fff, transparent),
      radial-gradient(2.5px 2.5px at 85% 25%, #cfe6ff, transparent),
      radial-gradient(2.5px 2.5px at 12% 68%, #fff, transparent),
      radial-gradient(2.5px 2.5px at 58% 18%, #cfe6ff, transparent);
    animation: starzoom 1.1s ease-in infinite;
  }
  @keyframes starzoom { 0% { transform: scale(0.5); opacity: 0.15; } 60% { opacity: 0.9; } 100% { transform: scale(2.6); opacity: 0; } }
  .sc-box { position: relative; z-index: 1; padding: 20px; }
  .sc-sub { font-family: ui-monospace, Menlo, monospace; color: var(--ok); letter-spacing: 3px; font-size: 0.95rem; }
  .sc-flavor { color: #eafce0; font-size: 0.95rem; margin-top: 10px; max-width: 320px; }
  .sc-title { font-family: ui-monospace, Menlo, monospace; color: var(--amber); font-weight: 700; font-size: 1.7rem; margin: 10px 0 22px; text-shadow: 0 0 16px rgba(245,166,35,0.6); }
  .sc-tap { color: #cfe6ff; font-size: 0.95rem; letter-spacing: 2px; animation: blink 1.1s ease-in-out infinite; }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
  .sc-count { margin-top: 16px; font-family: ui-monospace, Menlo, monospace; color: var(--muted); font-size: 1.2rem; }
</style>
