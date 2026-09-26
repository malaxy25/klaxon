<script lang="ts">
  import { onDestroy } from "svelte";
  import { setControl, clearHazard, type ControlView } from "./store.svelte";
  let { control }: { control: ControlView } = $props();

  const press = () => setControl(control.id, "");
  const flip = () => setControl(control.id, control.value === "true" ? "false" : "true");
  const onSlide = (e: Event) => setControl(control.id, (e.target as HTMLInputElement).value);
  const choose = (opt: string) => setControl(control.id, opt);

  let ticks = $derived(
    control.kind === "slider"
      ? Array.from({ length: (control.max ?? 0) - (control.min ?? 0) + 1 }, (_, i) => (control.min ?? 0) + i)
      : []
  );

  let holdProg = $state(0);
  let wipeProg = $state(0);
  let raf = 0, holding = false;
  let lx = 0, ly = 0, moved = 0;
  let decayTimer: any = 0, decayRaf = 0;
  const REPAIR_MS = 1500;
  const WIPE_PX = 150;

  // broken: gedrueckt halten
  function endHold() {
    holding = false; holdProg = 0; cancelAnimationFrame(raf);
    window.removeEventListener("pointerup", endHold);
    window.removeEventListener("touchend", endHold);
  }
  function holdStart(e: Event) {
    if (control.hazard !== "broken" && control.hazard !== "electro") return; e.preventDefault();
    holding = true; holdProg = 0;
    window.addEventListener("pointerup", endHold);
    window.addEventListener("touchend", endHold);
    const t0 = performance.now();
    const step = () => {
      if (!holding) return;
      holdProg = Math.min(1, (performance.now() - t0) / REPAIR_MS);
      if (holdProg >= 1) { clearHazard(control.id); endHold(); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  // slimed: wischen (native Touch-Events = iOS-zuverlaessig), kumulativ mit langsamem Zerfall; Tap zaehlt auch
  function bumpDone() { if (wipeProg >= 1) { wipeProg = 0; clearHazard(control.id); wipeCleanup(); } }
  function cancelDecay() { clearTimeout(decayTimer); cancelAnimationFrame(decayRaf); }
  function scheduleDecay() {
    cancelDecay();
    decayTimer = setTimeout(function dec() {
      decayRaf = requestAnimationFrame(() => { wipeProg = Math.max(0, wipeProg - 0.05); if (wipeProg > 0) dec(); });
    }, 1500);
  }
  function moveBy(x: number, y: number) {
    const d = Math.hypot(x - lx, y - ly);
    moved += d; wipeProg = Math.min(1, wipeProg + d / WIPE_PX);
    lx = x; ly = y; bumpDone();
  }
  function wTouchMove(e: TouchEvent) {
    if (control.hazard !== "slimed") return;
    if (e.cancelable) e.preventDefault();
    const t = e.touches[0]; if (t) moveBy(t.clientX, t.clientY);
  }
  function wTouchEnd() {
    window.removeEventListener("touchmove", wTouchMove);
    window.removeEventListener("touchend", wTouchEnd);
    window.removeEventListener("touchcancel", wTouchEnd);
    if (moved < 12) { wipeProg = Math.min(1, wipeProg + 0.34); bumpDone(); }
    scheduleDecay();
  }
  function wTouchStart(e: TouchEvent) {
    if (control.hazard !== "slimed") return;
    cancelDecay(); moved = 0;
    const t = e.touches[0]; if (!t) return; lx = t.clientX; ly = t.clientY;
    window.addEventListener("touchmove", wTouchMove, { passive: false });
    window.addEventListener("touchend", wTouchEnd);
    window.addEventListener("touchcancel", wTouchEnd);
  }
  function wMouseMove(e: PointerEvent) { if (control.hazard === "slimed") moveBy(e.clientX, e.clientY); }
  function wMouseEnd() {
    window.removeEventListener("pointermove", wMouseMove);
    window.removeEventListener("pointerup", wMouseEnd);
    if (moved < 12) { wipeProg = Math.min(1, wipeProg + 0.34); bumpDone(); }
    scheduleDecay();
  }
  function wMouseStart(e: PointerEvent) {
    if (control.hazard !== "slimed" || e.pointerType === "touch") return;
    cancelDecay(); moved = 0; lx = e.clientX; ly = e.clientY;
    window.addEventListener("pointermove", wMouseMove);
    window.addEventListener("pointerup", wMouseEnd);
  }
  function wipeCleanup() {
    window.removeEventListener("touchmove", wTouchMove);
    window.removeEventListener("touchend", wTouchEnd);
    window.removeEventListener("touchcancel", wTouchEnd);
    window.removeEventListener("pointermove", wMouseMove);
    window.removeEventListener("pointerup", wMouseEnd);
    cancelDecay();
  }
  // Dial: Zahlen im Ring - tippen ODER drehen (window-basiert, iOS-zuverlaessig)
  let dialCx = 0, dialCy = 0, dialing = false;
  let dialVals = $derived.by(() => { const min = control.min ?? 0, max = control.max ?? 0; const a: number[] = []; for (let v = min; v <= max; v++) a.push(v); return a; });
  function angleFor(v: number) { const min = control.min ?? 0, max = control.max ?? 0; const f = max > min ? (v - min) / (max - min) : 0; return -135 + f * 270; }
  function posFor(v: number) { const r = (angleFor(v) * Math.PI) / 180; const R = 36; return { x: 50 + R * Math.sin(r), y: 50 - R * Math.cos(r) }; }
  function dialAt(x: number, y: number) {
    const th = (Math.atan2(x - dialCx, -(y - dialCy)) * 180) / Math.PI;
    const c = Math.max(-135, Math.min(135, th));
    const min = control.min ?? 0, max = control.max ?? 0;
    const v = Math.max(min, Math.min(max, Math.round(min + ((c + 135) / 270) * (max - min))));
    if (String(v) !== control.value) setControl(control.id, String(v));
  }
  function setCenter(el: HTMLElement) { const r = el.getBoundingClientRect(); dialCx = r.left + r.width / 2; dialCy = r.top + r.height / 2; }
  function dialPMove(e: PointerEvent) { if (dialing) dialAt(e.clientX, e.clientY); }
  function dialTMove(e: TouchEvent) { if (!dialing) return; if (e.cancelable) e.preventDefault(); const t = e.touches[0]; if (t) dialAt(t.clientX, t.clientY); }
  function dialEnd() {
    dialing = false;
    window.removeEventListener("pointermove", dialPMove);
    window.removeEventListener("pointerup", dialEnd);
    window.removeEventListener("touchmove", dialTMove);
    window.removeEventListener("touchend", dialEnd);
    window.removeEventListener("touchcancel", dialEnd);
  }
  function dialTStart(e: TouchEvent) {
    dialing = true; setCenter(e.currentTarget as HTMLElement);
    const t = e.touches[0]; if (t) dialAt(t.clientX, t.clientY);
    window.addEventListener("touchmove", dialTMove, { passive: false });
    window.addEventListener("touchend", dialEnd);
    window.addEventListener("touchcancel", dialEnd);
  }
  function dialPStart(e: PointerEvent) {
    if (e.pointerType === "touch") return;
    dialing = true; setCenter(e.currentTarget as HTMLElement); dialAt(e.clientX, e.clientY);
    window.addEventListener("pointermove", dialPMove);
    window.addEventListener("pointerup", dialEnd);
  }

  // frozen: mehrfach tippen
  let frozenTaps = $state(0);
  function frozenTap(e: Event) { if (control.hazard !== "frozen") return; e.preventDefault(); frozenTaps += 1; if (frozenTaps >= 4) { frozenTaps = 0; clearHazard(control.id); } }

  // rewire: Stecker in die leuchtende Buchse ziehen (Pick-and-Drop)
  let rwRect: DOMRect | null = null, rwDrag = false, wasRewire = false;
  let plugX = $state(16), plugY = $state(82);
  function hashId(id: string) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return h; }
  let socket = $derived.by(() => { const h = hashId(control.id); return { x: 28 + (h % 45), y: 22 + ((h >> 8) % 40) }; });
  $effect(() => { if (control.hazard === "rewire" && !wasRewire) { plugX = 16; plugY = 82; } wasRewire = control.hazard === "rewire"; });
  function rwRel(cx: number, cy: number) {
    if (!rwRect || !rwRect.width) return;
    plugX = Math.max(4, Math.min(96, ((cx - rwRect.left) / rwRect.width) * 100));
    plugY = Math.max(4, Math.min(96, ((cy - rwRect.top) / rwRect.height) * 100));
  }
  function rwPMove(e: PointerEvent) { if (rwDrag) rwRel(e.clientX, e.clientY); }
  function rwTMove(e: TouchEvent) { if (!rwDrag) return; if (e.cancelable) e.preventDefault(); const t = e.touches[0]; if (t) rwRel(t.clientX, t.clientY); }
  function rwRelease() {
    rwDrag = false;
    window.removeEventListener("pointermove", rwPMove); window.removeEventListener("pointerup", rwRelease);
    window.removeEventListener("touchmove", rwTMove); window.removeEventListener("touchend", rwRelease); window.removeEventListener("touchcancel", rwRelease);
    if (Math.hypot(plugX - socket.x, plugY - socket.y) < 18) clearHazard(control.id);
    else { plugX = 16; plugY = 82; }
  }
  function rwEnd() {
    rwDrag = false;
    window.removeEventListener("pointermove", rwPMove); window.removeEventListener("pointerup", rwRelease);
    window.removeEventListener("touchmove", rwTMove); window.removeEventListener("touchend", rwRelease); window.removeEventListener("touchcancel", rwRelease);
  }
  function rwPStart(e: PointerEvent) {
    if (e.pointerType === "touch" || control.hazard !== "rewire") return;
    rwRect = (e.currentTarget as HTMLElement).getBoundingClientRect(); rwDrag = true; rwRel(e.clientX, e.clientY);
    window.addEventListener("pointermove", rwPMove); window.addEventListener("pointerup", rwRelease);
  }
  function rwTStart(e: TouchEvent) {
    if (control.hazard !== "rewire") return;
    rwRect = (e.currentTarget as HTMLElement).getBoundingClientRect(); rwDrag = true;
    const t = e.touches[0]; if (t) rwRel(t.clientX, t.clientY);
    window.addEventListener("touchmove", rwTMove, { passive: false }); window.addEventListener("touchend", rwRelease); window.addEventListener("touchcancel", rwRelease);
  }

  onDestroy(() => { endHold(); wipeCleanup(); dialEnd(); rwEnd(); });
</script>

<div class="control kind-{control.kind}" class:hazarded={!!control.hazard}
     style="grid-column: span {control.w}; grid-row: span {control.h};">
  <div class="face">
    {#if control.kind === "button"}
      <button class="hw press" onclick={press}>PRESS</button>
    {:else if control.kind === "toggle"}
      <button class="switch" class:on={control.value === "true"} onclick={flip} aria-label="toggle"><span class="knob"></span></button>
    {:else if control.kind === "slider"}
      <div class="ticks">{#each ticks as t}<span>{t}</span>{/each}</div>
      <input class="range" type="range" min={control.min} max={control.max} step="1" value={control.value} oninput={onSlide} />
      <div class="readout">{control.value}</div>
    {:else if control.kind === "selector"}
      <div class="opts">
        {#each control.options as opt}
          <button class="hw opt" class:on={control.value === opt} onclick={() => choose(opt)}>{opt}</button>
        {/each}
      </div>
    {:else if control.kind === "dial"}
      <div class="dial" ontouchstart={dialTStart} onpointerdown={dialPStart}>
        {#each dialVals as v}
          {@const p = posFor(v)}
          <span class="dial-num" class:on={Number(control.value) === v} style="left:{p.x}%; top:{p.y}%">{v}</span>
        {/each}
        <div class="dial-hub"></div>
        <span class="dial-ptr" style="transform: rotate({angleFor(Number(control.value))}deg)"></span>
      </div>
    {/if}
  </div>
  <div class="name">{control.label}</div>

  {#if control.hazard === "broken"}
    <div class="hz hz-broken" onpointerdown={holdStart}>
      <div class="hz-label">HOLD<br />TO FIX</div>
      <div class="hz-bar"><div class="hz-fill" style="width:{holdProg * 100}%"></div></div>
    </div>
  {:else if control.hazard === "slimed"}
    <div class="hz hz-slimed" ontouchstart={wTouchStart} onpointerdown={wMouseStart}>
      <div class="hz-label">WIPE<br />IT OFF</div>
      <div class="hz-bar"><div class="hz-fill green" style="width:{wipeProg * 100}%"></div></div>
    </div>
  {:else if control.hazard === "frozen"}
    <div class="hz hz-frozen" onpointerdown={frozenTap}>
      <div class="hz-label">FROZEN<br />tap ({frozenTaps}/4)</div>
      <div class="hz-bar"><div class="hz-fill ice" style="width:{frozenTaps / 4 * 100}%"></div></div>
    </div>
  {:else if control.hazard === "electro"}
    <div class="hz hz-electro" onpointerdown={holdStart}>
      <div class="hz-label">SHORT!<br />HOLD</div>
      <div class="hz-bar"><div class="hz-fill" style="width:{holdProg * 100}%"></div></div>
    </div>
  {:else if control.hazard === "overheat"}
    <div class="hz hz-overheat">
      <div class="hz-label">OVERHEAT<br />cooling...</div>
      <div class="hz-bar"><div class="hz-fill oh"></div></div>
    </div>
  {:else if control.hazard === "rewire"}
    <div class="hz hz-rewire" ontouchstart={rwTStart} onpointerdown={rwPStart}>
      <span class="rw-socket" style="left:{socket.x}%; top:{socket.y}%"></span>
      <span class="rw-plug" style="left:{plugX}%; top:{plugY}%"></span>
      <div class="hz-label">PLUG IN</div>
    </div>
  {/if}
</div>

<style>
  .control {
    position: relative; height: 100%; min-height: 0; overflow: hidden;
    display: grid; grid-template-rows: minmax(0, 1fr) auto; align-items: center; gap: 3px;
    padding: 4px 6px 3px; border-radius: 8px;
    background: linear-gradient(180deg, #1a3d38 0%, #12302c 100%);
    border: 1px solid var(--line); border-top-width: 3px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -6px 12px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.4);
  }
  .control::after {
    content: ""; position: absolute; inset: 4px; pointer-events: none; border-radius: 6px;
    background:
      radial-gradient(circle at 2px 2px, rgba(255,255,255,0.22) 0.5px, transparent 1.6px),
      radial-gradient(circle at calc(100% - 2px) 2px, rgba(255,255,255,0.22) 0.5px, transparent 1.6px),
      radial-gradient(circle at 2px calc(100% - 2px), rgba(255,255,255,0.22) 0.5px, transparent 1.6px),
      radial-gradient(circle at calc(100% - 2px) calc(100% - 2px), rgba(255,255,255,0.22) 0.5px, transparent 1.6px);
  }
  .kind-button   { border-top-color: var(--danger); }
  .kind-toggle   { border-top-color: var(--ok); }
  .kind-slider   { border-top-color: var(--amber); }
  .kind-selector { border-top-color: #7cc4e8; }
  .control.hazarded { filter: brightness(0.85); }

  .face { display: flex; flex-direction: column; justify-content: center; gap: 3px; min-height: 0; overflow: hidden; }
  .name {
    font-size: 0.68rem; color: var(--muted); text-align: center; line-height: 1.1; letter-spacing: 0.2px;
    overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }
  .hw {
    appearance: none; cursor: pointer; width: 100%;
    border: 1px solid var(--line); background: linear-gradient(180deg,#25514a,#1a3d38); color: var(--ink);
    border-radius: 7px; padding: 0.5em; font-weight: 700; font-size: 0.9rem;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.4);
  }
  .hw:active { transform: translateY(1px); }
  .hw.on { background: linear-gradient(180deg,#ffc24d,#f5a623); color: var(--amber-ink); border-color: var(--amber); box-shadow: 0 0 12px rgba(245,166,35,0.6); }
  .press { color: #fff; border: 1px solid #6b2020; border-radius: 999px; aspect-ratio: 1; max-width: 54px; margin: 0 auto; font-size: 0.72rem;
    background: radial-gradient(circle at 50% 32%, #ff7a7a 0%, #d23636 55%, #8f1c1c 100%);
    box-shadow: inset 0 -4px 8px rgba(0,0,0,0.5), inset 0 3px 6px rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.5); }
  .press:active { transform: translateY(1px); box-shadow: inset 0 2px 8px rgba(0,0,0,0.6), 0 0 14px rgba(229,72,77,0.7); }

  /* Toggle als Kippschalter */
  .switch { position: relative; height: 34px; width: 54px; margin: 1px auto; padding: 0; border-radius: 22px; cursor: pointer;
    background: linear-gradient(180deg,#0c1a19,#14302c); border: 1px solid var(--line); box-shadow: inset 0 2px 6px rgba(0,0,0,0.6); }
  .switch .knob { position: absolute; left: 5px; right: 5px; height: 14px; top: 17px; border-radius: 7px;
    background: linear-gradient(180deg,#95a5a2,#4a5b58); box-shadow: 0 1px 2px rgba(0,0,0,0.6); transition: top 0.12s ease, background 0.12s ease; }
  .switch.on { border-color: var(--amber); box-shadow: inset 0 2px 6px rgba(0,0,0,0.6), 0 0 12px rgba(245,166,35,0.5); }
  .switch.on .knob { top: 3px; background: linear-gradient(180deg,#ffd98a,#f5a623); }

  /* Slider mit Ticks */
  .ticks { display: flex; justify-content: space-between; padding: 0 2px; font-family: ui-monospace, Menlo, monospace; font-size: 0.52rem; color: var(--muted); }
  .range { width: 100%; accent-color: var(--amber); }
  .readout {
    align-self: center; font-family: ui-monospace, Menlo, monospace; color: var(--amber); font-size: 0.82rem;
    background: #0a1615; border: 1px solid var(--line); border-radius: 4px; padding: 0 8px;
    box-shadow: inset 0 0 8px rgba(0,0,0,0.6); text-shadow: 0 0 6px rgba(245,166,35,0.6);
  }
  .opts { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
  .opts .hw { width: auto; flex: 1 1 42%; padding: 0.4em; font-size: 0.8rem;
    background: #0a1615; color: var(--muted); border: 1px solid var(--line); box-shadow: inset 0 0 6px rgba(0,0,0,0.6); }
  .opts .hw.on { background: linear-gradient(180deg,#ffc24d,#f5a623); color: var(--amber-ink); border-color: var(--amber); box-shadow: 0 0 12px rgba(245,166,35,0.6); }

  /* Hazard-Overlays */
  .hz { position: absolute; inset: 0; z-index: 3; touch-action: none; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; border-radius: 8px; }
  .hz-label { font-family: ui-monospace, Menlo, monospace; font-weight: 700; font-size: 0.72rem; text-align: center; line-height: 1.05; color: #fff; background: rgba(0,0,0,0.72); padding: 3px 7px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.6); }
  .hz-bar { width: 72%; height: 6px; background: rgba(0,0,0,0.55); border-radius: 3px; overflow: hidden; }
  .hz-fill { height: 100%; background: var(--ok); }
  .hz-fill.green { background: #9be06a; }
  .hz-broken { border: 2px solid var(--danger);
    background: repeating-linear-gradient(45deg, rgba(229,72,77,0.18), rgba(229,72,77,0.18) 8px, rgba(0,0,0,0.4) 8px, rgba(0,0,0,0.4) 16px); }
  .dial { position: relative; width: 100%; height: 100%; min-height: 0; touch-action: none; cursor: pointer; }
  .dial-num { position: absolute; transform: translate(-50%,-50%); font-family: ui-monospace, Menlo, monospace; font-size: 0.72rem; color: var(--muted); pointer-events: none; }
  .dial-num.on { color: var(--amber); font-weight: 700; text-shadow: 0 0 7px rgba(245,166,35,0.85); transform: translate(-50%,-50%) scale(1.2); }
  .dial-hub { position: absolute; left: 50%; top: 50%; width: 20px; height: 20px; margin: -10px 0 0 -10px; border-radius: 50%;
    background: radial-gradient(circle at 50% 35%, #2c5a53, #10302a); border: 1px solid var(--line); box-shadow: inset 0 -3px 6px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.5); }
  .dial-ptr { position: absolute; left: 50%; bottom: 50%; width: 3.5px; height: 30%; margin-left: -1.75px; transform-origin: 50% 100%; transition: transform 0.06s linear;
    background: linear-gradient(to top, var(--amber), rgba(245,166,35,0.35)); border-radius: 2px; box-shadow: 0 0 6px rgba(245,166,35,0.6); pointer-events: none; }
  .hz-frozen { border: 2px solid #7cc4e8; touch-action: manipulation;
    background: radial-gradient(circle at 30% 30%, rgba(160,215,240,0.5), transparent 45%), rgba(40,90,120,0.5); }
  .hz-frozen .hz-fill.ice { background: #afe0ff; }
  .hz-electro { border: 2px solid #f5d23a;
    background: repeating-linear-gradient(60deg, rgba(245,210,58,0.22), rgba(245,210,58,0.22) 6px, rgba(0,0,0,0.4) 6px, rgba(0,0,0,0.4) 12px); }
  .hz-overheat { border: 2px solid #ff6b3d;
    background: radial-gradient(circle at 50% 45%, rgba(255,120,60,0.55), transparent 55%), rgba(120,30,10,0.5); }
  .hz-overheat .hz-fill.oh { background: #ff8a4d; animation: coolbar 4s linear forwards; }
  @keyframes coolbar { from { width: 100%; } to { width: 0%; } }
  .hz-rewire { border: 2px solid #7cc4e8; touch-action: none; background: rgba(18,48,66,0.55); }
  /* Buchse: dunkles Loch mit leuchtendem Rand + zwei Kontaktloecher */
  .rw-socket { position: absolute; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%;
    background: radial-gradient(circle, #0a1116 58%, #16303a 100%); border: 3px solid #7cc4e8;
    box-shadow: 0 0 12px rgba(124,196,232,0.9); animation: sockpulse 1s ease-in-out infinite; }
  .rw-socket::before, .rw-socket::after { content: ""; position: absolute; top: 50%; width: 4px; height: 9px; margin-top: -4.5px; background: #05090c; border: 1px solid #4a90ab; border-radius: 1px; }
  .rw-socket::before { left: 8px; } .rw-socket::after { right: 8px; }
  @keyframes sockpulse { 0%,100% { box-shadow: 0 0 9px rgba(124,196,232,0.7); } 50% { box-shadow: 0 0 16px rgba(124,196,232,1); } }
  /* Stecker: Griff mit zwei Stiften oben */
  .rw-plug { position: absolute; width: 26px; height: 20px; margin: -10px 0 0 -13px; border-radius: 4px;
    background: linear-gradient(180deg,#3b3b45,#1b1b22); border: 1px solid #565661; box-shadow: 0 2px 5px rgba(0,0,0,0.6); }
  .rw-plug::before, .rw-plug::after { content: ""; position: absolute; top: -7px; width: 4px; height: 8px; background: #e8c15a; border-radius: 1px; box-shadow: 0 0 4px rgba(232,193,90,0.6); }
  .rw-plug::before { left: 6px; } .rw-plug::after { right: 6px; }
  .hz-slimed { border: 2px solid #6fae3f;
    background: radial-gradient(circle at 28% 38%, rgba(140,215,95,0.65), transparent 42%), radial-gradient(circle at 72% 62%, rgba(95,185,70,0.6), transparent 46%), rgba(55,120,40,0.55); }

  @media (max-height: 720px) {
    .control { gap: 2px; padding: 3px 5px 2px; }
    .name { font-size: 0.55rem; }
    .readout { font-size: 0.74rem; }
    .ticks { font-size: 0.48rem; }
    .switch { height: 30px; width: 50px; }
    .switch .knob { height: 13px; top: 14px; }
    .switch.on .knob { top: 3px; }
    .press { max-width: 46px; }
  }
</style>
