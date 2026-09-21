<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  const lines = [
    "Waking the ship's reactor...",
    "Spinning up the flux capacitor...",
    "Poking the server with a stick...",
    "Defrosting the cryo-core...",
    "Aligning the neutrino manifold...",
    "Convincing the hamsters to run...",
    "Bribing the plasma injectors...",
    "The free server was napping. Rude to wake it...",
    "Reticulating splines...",
    "Almost there - free tier, be patient...",
  ];

  let msg = $state(lines[0]);
  let progress = $state(8);
  let elapsed = $state(0);
  let i = 0;
  let ticks = 0;
  let timer: ReturnType<typeof setInterval>;

  onMount(() => {
    timer = setInterval(() => {
      ticks++;
      elapsed = ticks * 0.25;
      progress = progress + (96 - progress) * 0.03;
      if (ticks % 10 === 0) { i = (i + 1) % lines.length; msg = lines[i]; }
    }, 250);
  });
  onDestroy(() => clearInterval(timer));
</script>

<div class="connecting">
  <div class="box">
    <div class="title">Boarding</div>
    <div class="msg">{msg}</div>
    <div class="pbar"><div class="pfill" style="width:{progress}%"></div></div>
    {#if elapsed > 3}
      <p class="hint">First start can take up to a minute while the free server wakes up. Hang tight.</p>
    {/if}
  </div>
</div>

<style>
  .connecting {
    position: fixed; inset: 0; z-index: 50;
    display: flex; align-items: center; justify-content: center;
    padding: 24px; background: rgba(10, 22, 21, 0.94);
    backdrop-filter: blur(2px);
    animation: cfade 0.25s ease 0.4s both;
  }
  @keyframes cfade { from { opacity: 0; } to { opacity: 1; } }
  .box {
    width: 100%; max-width: 380px; text-align: center;
    background: var(--panel); border: 1px solid var(--amber);
    border-radius: var(--radius); padding: 26px 22px;
  }
  .title {
    font-family: ui-monospace, Menlo, monospace; letter-spacing: 4px;
    color: var(--amber); font-size: 1.4rem; font-weight: 700; margin-bottom: 14px;
  }
  .msg {
    font-family: ui-monospace, Menlo, monospace; color: var(--ink);
    font-size: 1rem; min-height: 2.6em; line-height: 1.3;
    display: flex; align-items: center; justify-content: center;
  }
  .pbar { height: 8px; background: #0c1a19; border: 1px solid var(--line); border-radius: 5px; overflow: hidden; margin-top: 6px; }
  .pfill { height: 100%; background: var(--amber); transition: width 0.25s linear; }
  .hint { color: var(--muted); font-size: 0.8rem; margin: 14px 0 0; }
</style>
