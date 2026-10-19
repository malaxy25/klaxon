<script lang="ts">
  import { S, me, tutorialAck, tutorialSkip, tutorialEnd, enableMotion } from "./store.svelte";

  let mine = $derived(me());
  let ackNeed = $derived(S.players.filter((p) => p.coachAck).length);
  let ackDone = $derived(S.players.filter((p) => p.coachAcked).length);
  let confirmEnd = $state(false);
  let endT: ReturnType<typeof setTimeout>;

  function ok() {
    // Vor den Crew-Alerts: Bewegungssensor per Tap freischalten (iOS braucht die Geste)
    if (mine?.coachRole === "brief" && !S.motionOk) enableMotion();
    tutorialAck();
  }
  function endTraining() {
    if (!confirmEnd) { confirmEnd = true; clearTimeout(endT); endT = setTimeout(() => (confirmEnd = false), 3000); return; }
    tutorialEnd();
  }
</script>

<section class="coach role-{mine?.coachRole}">
  <div class="c-title">{S.tutTitle}</div>
  <p class="c-text">{mine?.coachText}</p>
  {#if mine?.coachAck}
    {#if mine.coachAcked}
      <div class="c-wait">Waiting for the crew {ackDone}/{ackNeed}...</div>
    {:else}
      <button class="btn wide primary c-ok" onclick={ok}>OK</button>
    {/if}
  {/if}
  {#if mine?.host}
    <div class="c-host">
      <button class="c-link" onclick={tutorialSkip}>skip step</button>
      <button class="c-link" onclick={endTraining}>{confirmEnd ? "tap again to end" : "end training"}</button>
    </div>
  {/if}
</section>

<style>
  .coach { flex: none; position: relative; z-index: 6; padding: 8px 12px; border-radius: 10px; background: #0e2420; border: 1px solid var(--line); border-left-width: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.4); }
  .coach.role-info, .coach.role-brief { border-color: #7cc4e8; }
  .coach.role-reader, .coach.role-own { border-color: var(--amber); }
  .coach.role-doer { border-color: var(--amber); background: #2a2410; }
  .coach.role-fix { border-color: var(--danger); background: #2a1415; }
  .coach.role-success, .coach.role-wait { border-color: var(--ok); }
  .coach.role-success .c-text { color: var(--ok); font-weight: 700; font-size: 1.05rem; }
  .c-title { font-family: ui-monospace, Menlo, monospace; font-size: 0.7rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); }
  .c-text { margin: 3px 0 0; color: var(--ink); font-size: 0.95rem; line-height: 1.3; }
  .c-ok { margin-top: 8px; padding: 0.6em; }
  .c-wait { margin-top: 6px; color: var(--ok); font-size: 0.85rem; }
  .c-host { display: flex; justify-content: flex-end; gap: 14px; margin-top: 4px; }
  .c-link { background: none; border: none; padding: 0; color: var(--muted); font-size: 0.72rem; text-decoration: underline; cursor: pointer; }
  @media (max-height: 720px) {
    .coach { padding: 6px 10px; }
    .c-text { font-size: 0.85rem; }
    .c-ok { margin-top: 6px; padding: 0.45em; }
  }
</style>
