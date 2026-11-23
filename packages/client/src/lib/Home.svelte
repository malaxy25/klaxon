<script lang="ts">
  import { onMount } from "svelte";
  import { S, createGame, joinByCode, updateName, openHelp, setDebug, fetchStats, fetchLeaderboard, REPO_URL, DONATE_URL, VIDEO_URL } from "./store.svelte";
  const DIFF_NAMES: Record<number, string> = { 1: "Casual", 3: "Normal", 5: "Hard", 8: "Insane" };
  // Best crews: this week if anyone played, else all time; the reader can switch.
  let allTime = $state(false);
  let showAll = $derived(allTime || S.topWeek.length === 0);
  let top = $derived((showAll ? S.topAll : S.topWeek).slice(0, 5));
  let code = $state((new URLSearchParams(location.search).get("r") || "").toUpperCase().slice(0, 6));

  let verTaps = 0; let verTimer: ReturnType<typeof setTimeout>;
  function tapVersion() {
    if (S.debug) { setDebug(false); verTaps = 0; alert("Debug OFF"); return; }
    verTaps++; clearTimeout(verTimer); verTimer = setTimeout(() => (verTaps = 0), 1500);
    if (verTaps >= 5) { verTaps = 0; setDebug(true); alert("Debug ON"); }
  }
  onMount(() => { fetchStats(); fetchLeaderboard(); const t = setInterval(fetchStats, 30000); return () => clearInterval(t); });
</script>

<div class="home">
  <h1>Klaxon</h1>
  <p class="tagline">A cooperative shouting game for the same room. Open the page, no download.</p>
  {#if S.liveRooms > 0}<p class="live"><span class="dot"></span>{S.liveRooms} {S.liveRooms === 1 ? "crew" : "crews"} playing right now</p>{/if}

  <label class="field">
    <span>Your name</span>
    <input class="input name" maxlength="20" placeholder="Your name"
           value={S.name} oninput={(e) => updateName((e.target as HTMLInputElement).value)} />
  </label>
  <p class="privacy">Your name may appear on the public leaderboard &ndash; a nickname is fine.</p>

  <button class="btn wide primary" disabled={S.connecting} onclick={createGame}>
    {S.connecting ? "Starting..." : "Start a new game"}
  </button>
  <p class="newhint">New here? Pick <b>Training</b> in the ready room - a guided walkthrough.</p>

  <div class="or">or join with a code</div>
  <div class="join-row">
    <input class="input" placeholder="Room code" maxlength="6" autocapitalize="characters" autocorrect="off" spellcheck="false" style="text-transform:uppercase" value={code} oninput={(e) => (code = (e.target as HTMLInputElement).value.toUpperCase())} />
    <button class="btn" disabled={!code || S.connecting} onclick={() => joinByCode(code)}>Join</button>
  </div>

  {#if S.connecting && S.waking}<p class="waking">Server is waking up&hellip; (free hosting naps after a while)</p>{/if}
  {#if S.error}<p class="error">{S.error}</p>{/if}

  {#if top.length}
    <div class="board">
      <div class="board-head">
        <span>Top crews {showAll ? "of all time" : "this week"}</span>
        {#if S.topWeek.length}<button class="linkbtn" onclick={() => (allTime = !allTime)}>{allTime ? "This week" : "All time"}</button>{/if}
      </div>
      <ol>
        {#each top as t, i (i)}
          <li><span class="pos">{i + 1}</span><span class="who">{t.names || "?"}<small>Sector {t.sector} on {DIFF_NAMES[t.startSector] ?? "Sector " + t.startSector} &middot; {t.crew} players</small></span><span class="pts">{t.score}</span></li>
        {/each}
      </ol>
    </div>
  {/if}

  <button class="btn wide" onclick={openHelp}>How to play</button>
  {#if VIDEO_URL}<a class="btn wide" href={VIDEO_URL} target="_blank" rel="noopener">&#9654; Watch how it works</a>{/if}

  <p class="seeit">See it in action</p>
  <video class="trailer" src="/klaxon-trailer.mp4" poster="/klaxon-trailer-poster.jpg" autoplay muted loop playsinline preload="metadata"></video>

  <footer class="version"><button class="verbtn" onclick={tapVersion}>Klaxon{#if S.version} v{S.version}{/if}</button> &middot; <a href={REPO_URL} target="_blank" rel="noopener">GitHub</a>{#if DONATE_URL} &middot; <a href={DONATE_URL} target="_blank" rel="noopener">☕ Coffee</a>{/if}{#if S.debug} &middot; <span class="dbgon">debug</span>{/if}</footer>
</div>
<style>
  .newhint { color: var(--muted); font-size: 0.8rem; text-align: center; margin: -4px 0 4px; }
  .newhint b { color: var(--amber); }
  .privacy { color: var(--muted); font-size: 0.75rem; margin: -6px 0 2px; }
  .board { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 14px; }
  .board-head { display: flex; justify-content: space-between; align-items: baseline; font-weight: 700; font-size: 0.9rem; }
  .linkbtn { background: none; border: none; color: var(--amber); font: inherit; font-size: 0.8rem; font-weight: 400; cursor: pointer; padding: 0; }
  .board ol { list-style: none; margin: 6px 0 0; padding: 0; }
  .board li { display: flex; align-items: baseline; gap: 8px; padding: 4px 0; border-top: 1px solid var(--line); font-size: 0.88rem; }
  .board .pos { color: var(--muted); width: 14px; }
  .board .who { flex: 1; overflow-wrap: anywhere; }
  .board .who small { display: block; color: var(--muted); font-size: 0.72rem; }
  .board .pts { color: var(--amber); font-weight: 700; font-family: ui-monospace, Menlo, monospace; }
  .verbtn { background: none; border: none; color: inherit; font: inherit; padding: 0; cursor: default; }
  .dbgon { color: #c98fe0; }
  .seeit { color: var(--muted); font-size: 0.85rem; text-align: center; margin: 22px 0 8px; letter-spacing: 0.5px; }
  .trailer { display: block; width: auto; max-width: 100%; max-height: 320px; margin: 2px auto 12px; border-radius: 16px; border: 1px solid var(--line); box-shadow: 0 8px 26px rgba(0,0,0,0.35); background: #0b1615; }
</style>