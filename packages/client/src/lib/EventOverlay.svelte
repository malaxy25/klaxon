<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { S, sendEventAction, enableMotion } from "./store.svelte";

  type Mode = "tap" | "hold" | "freeze";
  const INFO: Record<string, { title: string; action: string; hint: string; mode: Mode; gesture?: "shake" | "orient" }> = {
    meteor:    { title: "METEOR SHOWER", action: "SHAKE!", hint: "Shake your phone hard", mode: "tap", gesture: "shake" },
    blackhole: { title: "BLACK HOLE", action: "FLIP YOUR PHONE!", hint: "Turn it over / on its side", mode: "tap", gesture: "orient" },
    brace:     { title: "BRACE!", action: "TAP FAST!", hint: "", mode: "tap" },
    surge:     { title: "POWER SURGE", action: "HOLD!", hint: "Press and hold", mode: "hold" },
    freeze:    { title: "DECOMPRESSION", action: "DO NOT TOUCH!", hint: "Hands off the screen", mode: "freeze" },
    wormhole:  { title: "WORMHOLE", action: "STABILIZE", hint: "Panels swapped - you now control someone else s board!", mode: "tap" },
  };
  let info = $derived(INFO[S.eventType] ?? { title: S.eventType, action: "GO!", hint: "", mode: "tap" as Mode });

  let didIt = $state(false);
  let taps = $state(0);
  let holdProg = $state(0);
  let secs = $state(Math.ceil((S.eventMs || 6000) / 1000));
  let timer: ReturnType<typeof setInterval>;
  let shakeCount = 0, holding = false, holdRaf = 0;

  function complete() { if (didIt) return; didIt = true; sendEventAction(); }
  function onTap() { if (didIt) return; taps++; if (taps >= 3) complete(); }
  function holdStart(e: PointerEvent) {
    if (didIt) return; e.preventDefault(); holding = true; const t0 = performance.now();
    const step = () => { if (!holding) return; holdProg = Math.min(1, (performance.now() - t0) / 2000);
      if (holdProg >= 1) { holding = false; complete(); return; } holdRaf = requestAnimationFrame(step); };
    holdRaf = requestAnimationFrame(step);
  }
  function holdEnd() { holding = false; holdProg = 0; cancelAnimationFrame(holdRaf); }
  function onFreezeTouch() { sendEventAction(); } // beruehren = Fehlschlag

  function onMotion(e: DeviceMotionEvent) {
    const a = e.accelerationIncludingGravity || (e as any).acceleration; if (!a) return;
    if (Math.hypot(a.x || 0, a.y || 0, a.z || 0) > 22) { shakeCount++; if (shakeCount >= 3) complete(); }
  }
  function onOrient(e: DeviceOrientationEvent) {
    if (Math.abs(e.gamma ?? 0) > 55 || Math.abs(e.beta ?? 0) > 130) complete();
  }
  onMount(() => {
    timer = setInterval(() => { secs = Math.max(0, secs - 1); }, 1000);
    if (info.gesture === "shake") window.addEventListener("devicemotion", onMotion);
    if (info.gesture === "orient") window.addEventListener("deviceorientation", onOrient);
  });
  onDestroy(() => {
    clearInterval(timer);
    window.removeEventListener("devicemotion", onMotion);
    window.removeEventListener("deviceorientation", onOrient);
  });
  let doneCount = $derived(S.players.filter((p) => p.eventDone).length);
</script>

<div class="event-overlay" class:freeze={info.mode === "freeze"}
     onpointerdown={info.mode === "freeze" ? onFreezeTouch : undefined}>
  <div class="ev-box">
    <div class="ev-title">{info.title}</div>
    <div class="ev-action">{info.action}</div>

    {#if info.mode === "freeze"}
      <div class="ev-hint">Do not tap anything until the timer ends</div>
    {:else if didIt}
      <div class="ev-waiting">Done - waiting for crew {doneCount}/{S.players.length}</div>
    {:else if info.mode === "hold"}
      <button class="btn wide primary" onpointerdown={holdStart} onpointerup={holdEnd} onpointerleave={holdEnd} onpointercancel={holdEnd}>HOLD</button>
      <div class="ev-bar"><div class="ev-fill" style="width:{holdProg * 100}%"></div></div>
    {:else}
      <button class="btn wide primary tapbtn" onpointerdown={(e) => { e.preventDefault(); onTap(); }}>
        {S.eventType === "brace" || S.eventType === "wormhole" ? "TAP! (" + taps + "/3)" : "Can't move? TAP (" + taps + "/3)"}
      </button>
      {#if info.hint}<div class="ev-hint">{info.hint}</div>{/if}
      {#if !S.motionOk && info.gesture}<button class="helplink" onclick={enableMotion}>Enable shake &amp; tilt</button>{/if}
    {/if}

    <div class="ev-count">{secs}s</div>
  </div>
</div>

<style>
  .event-overlay { position: fixed; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; padding: 22px; background: rgba(60,10,12,0.9); }
  .event-overlay.freeze { background: rgba(10,30,50,0.92); }
  .ev-box { width: 100%; max-width: 420px; text-align: center; }
  .ev-title { font-family: ui-monospace, Menlo, monospace; color: #ffd9d2; letter-spacing: 3px; font-size: 1rem; }
  .event-overlay.freeze .ev-title { color: #cfe6ff; }
  .ev-action { font-family: ui-monospace, Menlo, monospace; color: var(--danger); font-weight: 700; font-size: 2.2rem; margin: 8px 0 20px; text-shadow: 0 0 14px rgba(229,72,77,0.7); }
  .event-overlay.freeze .ev-action { color: #7cc4e8; text-shadow: 0 0 14px rgba(124,196,232,0.7); }
  .ev-bar { height: 8px; margin-top: 12px; background: rgba(0,0,0,0.5); border-radius: 4px; overflow: hidden; }
  .ev-fill { height: 100%; background: var(--amber); }
  .ev-hint { color: var(--muted); margin-top: 10px; font-size: 0.85rem; }
  .ev-waiting { color: var(--ok); font-weight: 600; }
  .ev-count { margin-top: 18px; font-family: ui-monospace, Menlo, monospace; font-size: 1.6rem; color: var(--amber); }
  @media (prefers-reduced-motion: no-preference) { .ev-action { animation: evpulse 0.6s ease-in-out infinite alternate; } }
  @keyframes evpulse { from { transform: scale(1); } to { transform: scale(1.08); } }
</style>
