<script lang="ts">
  import { onMount } from "svelte";
  import { S, me, playAgain, sendFeedback, DONATE_URL } from "./store.svelte";
  let mine = $derived(me());

  const DIFF_NAMES: Record<number, string> = { 1: "Casual", 3: "Normal", 5: "Hard", 8: "Insane" };
  let diffName = $derived(DIFF_NAMES[S.startLevel] ?? ("Sector " + S.startLevel));

  const DIFF_WEIGHT: Record<number, number> = { 1: 1, 3: 2, 5: 3, 8: 4 };
  let weight = $derived(DIFF_WEIGHT[S.startLevel] ?? 2);
  let rankScore = $derived(S.level * weight);
  let rank = $derived(
    rankScore >= 32 ? "Legendary crew" :
    rankScore >= 22 ? "Elite crew" :
    rankScore >= 14 ? "Ace crew" :
    rankScore >= 8  ? "Solid crew" : "Rookie crew"
  );

  let bestSector = $state(0);
  let isNewBest = $state(false);
  onMount(() => {
    try {
      const key = "klaxon_best_" + S.startLevel;
      const prev = parseInt(localStorage.getItem(key) || "0", 10) || 0;
      if (S.level > prev) { isNewBest = true; bestSector = S.level; localStorage.setItem(key, String(S.level)); }
      else { bestSector = prev; }
    } catch { /* ignore */ }
  });

  let players = $derived([...S.players].sort((a, b) => b.statCompleted - a.statCompleted));
  let totalCompleted = $derived(players.reduce((a, p) => a + p.statCompleted, 0));
  let mvp = $derived(players.reduce((b: any, p) => (p.statCompleted > (b?.statCompleted ?? -1) ? p : b), null));
  let ignored = $derived(players.reduce((b: any, p) => (p.statExpired > (b?.statExpired ?? 0) ? p : b), null));

  const VERDICTS: [string, string][] = [["too_easy", "Too easy"], ["just_right", "Just right"], ["too_hard", "Too hard"]];
  let verdict = $state("");
  let fb = $state("");
  const submit = () => {
    const payload = (verdict ? "[" + verdict + "] " : "") + fb.trim();
    if (payload.trim()) sendFeedback(payload);
  };
</script>

<div class="over">
  <h1>Game over</h1>
  <p class="tagline">Reached <b>Sector {S.level}</b> on <b>{diffName}</b>.</p>

  <div class="rankrow">
    <span class="rank">{rank}</span>
    {#if isNewBest}<span class="newbest">&#9733; New best!</span>{/if}
  </div>
  {#if bestSector}<p class="bestline">Your best on {diffName}: Sector {bestSector}</p>{/if}

  <div class="stats">
    <div class="big">{totalCompleted}<span>orders completed together</span></div>
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
    <p class="legend">Done = orders you completed &middot; Missed = orders that ran out of time</p>
  </div>

  <div class="feedback">
    {#if S.feedbackSent}
      <p class="thanks">Thanks for the feedback!</p>
    {:else}
      <span class="fb-q">How was it? (sent to the dev, no name/email needed)</span>
      <div class="chips">
        {#each VERDICTS as [v, label] (v)}
          <button class="chip" class:sel={verdict === v} onclick={() => (verdict = verdict === v ? "" : v)}>{label}</button>
        {/each}
      </div>
      <textarea class="input fb" rows="2" maxlength="500" bind:value={fb} placeholder="Anything to add? A bug? An idea?"></textarea>
      <button class="btn wide" disabled={!verdict && !fb.trim()} onclick={submit}>Send feedback</button>
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
  .rankrow { display: flex; align-items: center; justify-content: center; gap: 10px; margin: -2px 0 2px; }
  .rank { font-family: ui-monospace, Menlo, monospace; font-weight: 700; color: var(--amber); font-size: 1.15rem; letter-spacing: 0.5px; }
  .newbest { font-size: 0.8rem; font-weight: 700; color: var(--amber-ink); background: var(--amber); padding: 2px 8px; border-radius: 999px; }
  .bestline { text-align: center; color: var(--muted); font-size: 0.82rem; margin: 0 0 6px; }
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
  .legend { color: var(--muted); font-size: 0.76rem; margin: 2px 0 0; }
  .feedback { display: flex; flex-direction: column; gap: 8px; }
  .fb-q { color: var(--muted); font-size: 0.9rem; }
  .chips { display: flex; gap: 8px; }
  .chip { flex: 1; background: var(--panel); border: 1px solid var(--line); color: var(--ink); border-radius: 10px; padding: 8px 6px; font-size: 0.85rem; cursor: pointer; }
  .chip.sel { background: var(--amber); color: var(--amber-ink); border-color: var(--amber); font-weight: 700; }
  .input.fb { letter-spacing: 0; font-size: 0.95rem; resize: vertical; font-family: inherit; }
  .thanks { color: var(--ok); text-align: center; font-weight: 600; }
  .coffee { display:block; text-align:center; margin-top:14px; color: var(--muted); font-size:0.8rem; text-decoration:none; }
  .coffee:hover { color: var(--amber); }
</style>
