<script lang="ts">
  import { closeHelp } from "./store.svelte";
</script>

<svelte:window onkeydown={(e) => { if (e.key === "Escape") closeHelp(); }} />

<div class="help-backdrop" onclick={closeHelp} role="presentation">
  <div class="help" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
    <h2>How to play</h2>
    <p class="lead">You are a crew flying a failing spaceship. Everyone plays on their own
      phone, together in the same room.</p>
    <ol>
      <li><b>Read your command out loud.</b> It usually controls something on
        <b>someone else's</b> panel - so shout it across the room.</li>
      <li><b>Hear a command for one of your controls? Do it - fast.</b> Whoever has that
        control acts on it.</li>
      <li><b>Keep the bar above the rising red line.</b> Completed commands push it up;
        misses and time push it down.</li>
      <li><b>Fill the bar to jump to the next sector.</b> Each sector is faster and harsher.</li>
    </ol>
    <h3>Your controls</h3>
    <ul class="legend">
      <li><span class="dot b"></span> <b>Button</b> - press it</li>
      <li><span class="dot t"></span> <b>Toggle</b> - switch on / off</li>
      <li><span class="dot s"></span> <b>Slider</b> - set the number</li>
      <li><span class="dot x"></span> <b>Selector</b> - pick the option</li>
    </ul>
    <h3>Alerts</h3>
    <ul class="legend">
      <li><b>Jammed control</b> - hold it down to fix it.</li>
      <li><b>Alien slime</b> - wipe across it to clean it off.</li>
      <li><b>Full-screen alert</b> - react before the timer: shake, flip, hold or tap - or DON'T touch.</li>
    </ul>
    <p class="tip">It gets loud and chaotic. That is the point.</p>
    <button class="btn wide primary" onclick={closeHelp}>Got it</button>
  </div>
</div>

<style>
  .help-backdrop { position: fixed; inset: 0; z-index: 60; background: rgba(10,22,21,0.92); display: flex; align-items: flex-start; justify-content: center; padding: 18px; overflow-y: auto; }
  .help { width: 100%; max-width: 440px; margin: auto; background: var(--panel); border: 1px solid var(--amber); border-radius: var(--radius); padding: 22px; }
  h2 { margin: 0 0 10px; color: var(--amber); font-family: ui-monospace, Menlo, monospace; letter-spacing: 2px; }
  h3 { margin: 18px 0 6px; font-size: 0.95rem; color: var(--ink); }
  .lead { color: var(--ink); margin: 0 0 12px; line-height: 1.4; }
  ol { margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 8px; }
  ol li { line-height: 1.35; }
  .legend { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .legend li { display: flex; align-items: center; gap: 8px; }
  .dot { width: 12px; height: 12px; border-radius: 3px; display: inline-block; flex: none; }
  .dot.b { background: var(--danger); }
  .dot.t { background: var(--ok); }
  .dot.s { background: var(--amber); }
  .dot.x { background: #7cc4e8; }
  .tip { color: var(--muted); font-style: italic; margin: 14px 0 16px; }
</style>
