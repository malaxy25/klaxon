<script lang="ts">
  import { onMount } from "svelte";
  import { S, me, playAgain, sendFeedback, DONATE_URL } from "./store.svelte";
  let mine = $derived(me());

  const DIFF_NAMES: Record<number, string> = { 1: "Casual", 3: "Normal", 5: "Hard", 8: "Insane" };
  let diffName = $derived(DIFF_NAMES[S.startLevel] ?? ("Sector " + S.startLevel));

  // Difficulty = starting sector; every sector has the same pace for everyone.
  // Fair score = how far you got + a cold-start bonus for the warm-up sectors you skipped.
  let rankScore = $derived(S.level + Math.max(0, S.startLevel - 1));
  let rank = $derived(
    rankScore >= 16 ? "Legendary crew" :
    rankScore >= 12 ? "Elite crew" :
    rankScore >= 9  ? "Ace crew" :
    rankScore >= 6  ? "Solid crew" : "Rookie crew"
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
  // Global leaderboard (arrives a moment after game over; absent without database)
  let rk = $derived(S.ranking);
  let myRank = $derived(rk ? rk.players[S.sessionId] : null);
  let ignored = $derived(players.reduce((b: any, p) => (p.statExpired > (b?.statExpired ?? 0) ? p : b), null));

  const VERDICTS: [string, string][] = [["too_easy", "Too easy"], ["just_right", "Just right"], ["too_hard", "Too hard"]];
  let verdict = $state("");
  let fb = $state("");
  let email = $state("");
  let contact = $state(false);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  let emailOk = $derived(EMAIL_RE.test(email.trim()));
  let emailBad = $derived(email.trim() !== "" && !emailOk);
  $effect(() => { if (!emailOk) contact = false; });
  const submit = () => {
    const payload = (verdict ? "[" + verdict + "] " : "") + fb.trim();
    if (payload.trim() && !emailBad) sendFeedback(payload, emailOk ? email.trim() : "", contact);
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
  {#if rk}
    <div class="global">
      {#if rk.crew.better !== null}
        <div class="pct">Better than <b>{rk.crew.better}%</b> of all crews</div>
      {/if}
      <div class="place">#{rk.crew.place} of {rk.crew.n} crews worldwide &middot; score {rk.crew.score}</div>
      {#if myRank}
        <div class="you">You: {myRank.perMin} orders/min{#if myRank.better !== null}{" · "}faster than <b>{myRank.better}%</b> of players{/if}</div>
      {/if}
    </div>
  {/if}

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

  {#if rk && rk.top.length}
    <div class="stats">
      <span class="toptitle">Top crews (all time)</span>
      <table class="scoreboard top">
        <thead><tr><th>#</th><th>Crew</th><th>Score</th></tr></thead>
        <tbody>
          {#each rk.top as t, i (i)}
            <tr class:mine={t.mine}>
              <td>{i + 1}</td>
              <td><span class="names">{t.names || "?"}</span><span class="sub">Sector {t.sector} on {DIFF_NAMES[t.startSector] ?? "Sector " + t.startSector} &middot; {t.crew} players &middot; {t.date}</span></td>
              <td>{t.score}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="legend">Score = sector reached + bonus for a harder start</p>
    </div>
  {/if}

  <div class="feedback">
    {#if S.feedbackSent}
      <p class="thanks">Thanks for the feedback!</p>
    {:else}
      <span class="fb-q">How was it? (sent to the dev, email optional)</span>
      <div class="chips">
        {#each VERDICTS as [v, label] (v)}
          <button class="chip" class:sel={verdict === v} onclick={() => (verdict = verdict === v ? "" : v)}>{label}</button>
        {/each}
      </div>
      <textarea class="input fb" rows="2" maxlength="500" bind:value={fb} placeholder="Anything to add? A bug? An idea?"></textarea>
      <input class="input fb" class:bad={emailBad} type="email" maxlength="120" autocomplete="email" bind:value={email} placeholder="Email (optional)" />
      {#if emailBad}<span class="fb-err">Please enter a valid email address.</span>{/if}
      <label class="fb-contact" class:off={!emailOk}>
        <input type="checkbox" bind:checked={contact} disabled={!emailOk} />
        You may contact me about my feedback
      </label>
      {#if email.trim() || contact}<span class="fb-privacy">Your email is only used to reply to your feedback and never shared.</span>{/if}
      <button class="btn wide" disabled={(!verdict && !fb.trim()) || emailBad} onclick={submit}>Send feedback</button>
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
  .global { text-align: center; margin: 0 0 8px; display: flex; flex-direction: column; gap: 2px; }
  .global .pct { font-size: 1.05rem; }
  .global .pct b, .global .you b { color: var(--amber); }
  .global .place, .global .you { color: var(--muted); font-size: 0.85rem; }
  .toptitle { font-weight: 700; }
  .scoreboard.top td:first-child, .scoreboard.top th:first-child { width: 28px; }
  .scoreboard.top td:nth-child(2), .scoreboard.top th:nth-child(2) { text-align: left; width: auto; }
  .scoreboard.top .names { display: block; overflow-wrap: anywhere; }
  .scoreboard.top .sub { display: block; color: var(--muted); font-size: 0.75rem; }
  .scoreboard.top tr.mine td { color: var(--amber); font-weight: 700; }
  .feedback { display: flex; flex-direction: column; gap: 8px; }
  .fb-q { color: var(--muted); font-size: 0.9rem; }
  .chips { display: flex; gap: 8px; }
  .chip { flex: 1; background: var(--panel); border: 1px solid var(--line); color: var(--ink); border-radius: 10px; padding: 8px 6px; font-size: 0.85rem; cursor: pointer; }
  .chip.sel { background: var(--amber); color: var(--amber-ink); border-color: var(--amber); font-weight: 700; }
  .input.fb { letter-spacing: 0; font-size: 0.95rem; resize: vertical; font-family: inherit; }
  .input.fb.bad { border-color: var(--danger); }
  .fb-err { color: var(--danger); font-size: 0.8rem; margin-top: -4px; }
  .fb-contact { display: flex; align-items: center; gap: 8px; color: var(--ink); font-size: 0.85rem; cursor: pointer; }
  .fb-contact.off { color: var(--muted); cursor: default; }
  .fb-privacy { color: var(--muted); font-size: 0.76rem; margin-top: -4px; }
  .thanks { color: var(--ok); text-align: center; font-weight: 600; }
  .coffee { display:block; text-align:center; margin-top:14px; color: var(--muted); font-size:0.8rem; text-decoration:none; }
  .coffee:hover { color: var(--amber); }
</style>
