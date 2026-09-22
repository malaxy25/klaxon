<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { S, sendEventAction } from "./store.svelte";

  const LABELS: Record<string, { title: string; action: string; hint: string }> = {
    meteor: { title: "METEOR SHOWER", action: "SHAKE!", hint: "Shake your phone hard" },
    blackhole: { title: "BLACK HOLE", action: "FLIP YOUR PHONE!", hint: "Turn it over / on its side" },
    brace: { title: "BRACE!", action: "TAP FAST!", hint: "" },
  };
  let info = $derived(LABELS[S.eventType] ?? { title: S.eventType, action: "GO!", hint: "" });

  let didIt = $state(false);
  let taps = $state(0);
  let secs = $state(Math.ceil((S.eventMs || 6000) / 1000));
  let timer: ReturnType<typeof setInterval>;
  let shakeCount = 0;

  function complete() { if (didIt) return; didIt = true; sendEventAction(); }
  function onTap() { if (didIt) return; taps++; if (taps >= 5) complete(); }
  function onMotion(e: DeviceMotionEvent) {
    const a = e.accelerationIncludingGravity || (e as any).acceleration; if (!a) return;
    const mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    if (mag > 22) { shakeCount++; if (shakeCount >= 3) complete(); }
  }
  function onOrient(e: DeviceOrientationEvent) {
    const beta = Math.abs(e.beta ?? 0), gamma = Math.abs(e.gamma ?? 0);
    if (gamma > 55 || beta > 130) complete();
  }
  onMount(() => {
    timer = setInterval(() => { secs = Math.max(0, secs - 1); }, 1000);
    if (S.eventType === "meteor") window.addEventListener("devicemotion", onMotion);
    if (S.eventType === "blackhole") window.addEventListener("deviceorientation", onOrient);
  });
  onDestroy(() => {
    clearInterval(timer);
    window.removeEventListener("devicemotion", onMotion);
    window.removeEventListener("deviceorientation", onOrient);
  });
  let doneCount = $derived(S.players.filter((p) => p.eventDone).length);
</script>

<div class="event-overlay">
  <div class="ev-box">
    <div class="ev-title">{info.title}</div>
    <div class="ev-action">{info.action}</div>
    {#if !didIt}
      <button class="btn wide primary" onclick={onTap}>
        {S.eventType === "brace" ? "TAP! (" + taps + "/5)" : "Can't move? TAP (" + taps + "/5)"}
      </button>
      {#if info.hint}<div class="ev-hint">{info.hint}</div>{/if}
    {:else}
      <div class="ev-waiting">Done - waiting for crew {doneCount}/{S.players.length}</div>
    {/if}
    <div class="ev-count">{secs}s</div>
  </div>
</div>

<style>
  .event-overlay { position: fixed; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; padding: 22px; background: rgba(60,10,12,0.9); }
  .ev-box { width: 100%; max-width: 420px; text-align: center; }
  .ev-title { font-family: ui-monospace, Menlo, monospace; color: #ffd9d2; letter-spacing: 3px; font-size: 1rem; }
  .ev-action { font-family: ui-monospace, Menlo, monospace; color: var(--danger); font-weight: 700; font-size: 2.3rem; margin: 8px 0 20px; text-shadow: 0 0 14px rgba(229,72,77,0.7); }
  .ev-hint { color: var(--muted); margin-top: 10px; font-size: 0.85rem; }
  .ev-waiting { color: var(--ok); font-weight: 600; }
  .ev-count { margin-top: 18px; font-family: ui-monospace, Menlo, monospace; font-size: 1.6rem; color: var(--amber); }
  @media (prefers-reduced-motion: no-preference) { .ev-action { animation: evpulse 0.6s ease-in-out infinite alternate; } }
  @keyframes evpulse { from { transform: scale(1); } to { transform: scale(1.08); } }
</style>
