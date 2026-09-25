<script lang="ts">
  import { S, me, playAgain, sendFeedback , DONATE_URL} from "./store.svelte";
  let mine = $derived(me());

  const DIFF_NAMES: Record<number, string> = { 1: "Casual", 3: "Normal", 5: "Hard", 8: "Insane" };
  let diffName = $derived(DIFF_NAMES[S.startLevel] ?? ("Sector " + S.startLevel));

  let players = $derived([...S.players].sort((a, b) => b.statCompleted - a.statCompleted));
  let totalCompleted = $derived(players.reduce((a, p) => a + p.statCompleted, 0));
  let mvp = $derived(players.reduce((b: any, p) => (p.statCompleted > (b?.statCompleted ?? -1) ? p : b), null));
  let ignored = $derived(players.reduce((b: any, p) => (p.statExpired > (b?.statExpired ?? 0) ? p : b), null));

  let fb = $state("");
  const submit = () => { const t = fb.trim(); if (t) sendFeedback(t); };
</script>

<div class="over">
  <h1>Game over</h1>
  <p class="tagline">Reached <b>Sector {S.level}</b> on <b>{diffName}</b>.</p>

  <div class="stats">
    <div class="big">{totalCompleted}<span>commands completed</span></div>
    {#if mvp && mvp.statCompleted > 0}
      <div class="award"><span class="medal mvp">MVP</span> {mvp.name} - {mvp.statCompleted} done</div>
    {/if}
    {#if ignored && ignored.statExpired > 0}
      <div class="award"><span class="medal bad">Loose cannon</span> {ignored.name} - {ignored.statExpired} orders ignored</div>
    {:else}
      <div class="award good">Nobody dropped an order. Impressive.</div>
    {/if}

    <table class="scoreboard">
      <thead><tr><th>Crew</th><th>Done</th><th>Missed</th></tr></thead>
      <tbody>
        {#each players as p (p.id)}
          <tr><td>{p.name}{p.id === S.sessionId ? " (you)" : ""}</td><td>{p.statCompleted}</td><td>{p.statExpired}</td></tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="feedback">
    {#if S.feedbackSent}
      <p class="thanks">Thanks for the feedback!</p>
    {:else}
      <label class="field">
        <span>How was it? (sent to the dev, no name/email needed)</span>
        <textarea class="input fb" rows="3" maxlength="500" bind:value={fb} placeholder="Too easy? A bug? An idea?"></textarea>
      </label>
      <button class="btn wide" disabled={!fb.trim()} onclick={submit}>Send feedback</button>
    {/if}
  </div>

  {#if mine?.host}
    <button class="btn wide primary" onclick={playAgain}>Play again</button>
  {:else}
    <p class="hint">Waiting for the host to start a new round...</p>
  {/if}
  <button class="btn wide" onclick={() => (location.href = location.pathname)}>Leave</button>
  {#if DONATE_URL}<a class="coffee" href={DONATE_URL} target="_blank" rel="noopener">☕ Enjoying Klaxon? Buy me a coffee</a>{/if}
</div>

<style>
  .stats { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .big { font-family: ui-monospace, Menlo, monospace; font-size: 2.2rem; font-weight: 700; color: var(--amber); text-align: center; line-height: 1; }
  .big span { display: block; font-size: 0.8rem; color: var(--muted); font-weight: 400; margin-top: 4px; }
  .award { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; }
  .award.good { color: var(--ok); }
  .medal { font-family: ui-monospace, Menlo, monospace; font-size: 0.72rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
  .medal.mvp { background: var(--amber); color: var(--amber-ink); }
  .medal.bad { background: var(--danger); color: #fff; }
  .scoreboard { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 0.9rem; }
  .scoreboard th { text-align: left; color: var(--muted); font-weight: 600; border-bottom: 1px solid var(--line); padding: 4px 6px; }
  .scoreboard td { padding: 4px 6px; border-bottom: 1px solid var(--line); }
  .scoreboard td:nth-child(2), .scoreboard td:nth-child(3), .scoreboard th:nth-child(2), .scoreboard th:nth-child(3) { text-align: right; width: 60px; }
  .feedback { display: flex; flex-direction: column; gap: 8px; }
  .input.fb { letter-spacing: 0; font-size: 0.95rem; resize: vertical; font-family: inherit; }
  .thanks { color: var(--ok); text-align: center; font-weight: 600; }
  .coffee { display:block; text-align:center; margin-top:14px; color: var(--muted); font-size:0.8rem; text-decoration:none; }
  .coffee:hover { color: var(--amber); }
</style>