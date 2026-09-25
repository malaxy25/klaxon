<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { S, sendContinue } from "./store.svelte";
  let secs = $state(Math.ceil((S.intermissionMs || 8000) / 1000));
  let timer: ReturnType<typeof setInterval>;
  onMount(() => { timer = setInterval(() => { secs = Math.max(0, secs - 1); }, 1000); });
  onDestroy(() => clearInterval(timer));
</script>

<div class="sector-overlay" onpointerdown={sendContinue} role="button" tabindex="0">
  <div class="warp"></div>
  <div class="sc-box">
    <div class="sc-sub">SECTOR {S.level} CLEARED</div>
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
    position: absolute; inset: -25%; pointer-events: none; opacity: 0.7;
    background:
      radial-gradient(circle at 50% 50%, rgba(124,196,232,0.18), transparent 55%),
      repeating-linear-gradient(90deg, transparent 0 38px, rgba(255,255,255,0.07) 38px 40px),
      radial-gradient(1.5px 1.5px at 18% 28%, #fff, transparent),
      radial-gradient(1.5px 1.5px at 72% 62%, #cfe6ff, transparent),
      radial-gradient(1.5px 1.5px at 42% 78%, #fff, transparent),
      radial-gradient(1.5px 1.5px at 88% 22%, #cfe6ff, transparent);
    animation: warp 0.5s linear infinite;
  }
  @keyframes warp { from { transform: translateX(0); } to { transform: translateX(-40px); } }
  .sc-box { position: relative; z-index: 1; padding: 20px; }
  .sc-sub { font-family: ui-monospace, Menlo, monospace; color: var(--ok); letter-spacing: 3px; font-size: 0.95rem; }
  .sc-title { font-family: ui-monospace, Menlo, monospace; color: var(--amber); font-weight: 700; font-size: 1.7rem; margin: 10px 0 22px; text-shadow: 0 0 16px rgba(245,166,35,0.6); }
  .sc-tap { color: #cfe6ff; font-size: 0.95rem; letter-spacing: 2px; animation: blink 1.1s ease-in-out infinite; }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
  .sc-count { margin-top: 16px; font-family: ui-monospace, Menlo, monospace; color: var(--muted); font-size: 1.2rem; }
</style>
