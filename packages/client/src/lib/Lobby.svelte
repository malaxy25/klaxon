<script lang="ts">
  import QRCode from "qrcode";
  import { S, me, ready, start, setDifficulty, joinUrl, updateName, commitName, openHelp, enableMotion, VERSION, REPO_URL } from "./store.svelte";

  let qr = $state("");
  let mine = $derived(me());
  let canStart = $derived(S.players.length >= 2 && S.players.every((p) => p.ready));

  const DIFFS = [
    { label: "Casual", level: 1 },
    { label: "Normal", level: 3 },
    { label: "Hard", level: 5 },
    { label: "Insane", level: 8 },
  ];
  let diffLabel = $derived(DIFFS.find((d) => d.level === S.startLevel)?.label ?? ("Sector " + S.startLevel));

  $effect(() => {
    if (S.roomId) {
      QRCode.toDataURL(joinUrl(), { margin: 1, width: 220 })
        .then((d) => (qr = d))
        .catch(() => (qr = ""));
    }
  });
</script>

<div class="lobby">
  <h1>Ready room</h1>
  <p class="hint">Others join by scanning the code - same room, no download.</p>
  <button class="helplink" onclick={openHelp}>How to play</button>
  <button class="helplink" onclick={enableMotion}>{S.motionOk ? "Motion enabled (shake/tilt)" : "Enable shake & tilt (optional)"}</button>

  <div class="join-card">
    <div class="code">{S.code}</div>
    {#if qr}<img class="qr" src={qr} alt="Scan to join" width="220" height="220" />{/if}
    <div class="url">{joinUrl()}</div>
  </div>

  <label class="field">
    <span>Your name</span>
    <input class="input name" maxlength="20" placeholder="Your name"
           value={S.name}
           oninput={(e) => updateName((e.target as HTMLInputElement).value)}
           onchange={commitName} onblur={commitName} />
  </label>

  <ul class="players">
    {#each S.players as p (p.id)}
      <li class:ready={p.ready}>
        <span>{p.name}{p.host ? " - host" : ""}{p.id === S.sessionId ? " - you" : ""}</span>
        <span>{p.ready ? "ready" : "waiting"}</span>
      </li>
    {/each}
  </ul>

  <div class="difficulty">
    <span class="diff-label">Difficulty: <b>{diffLabel}</b></span>
    {#if mine?.host}
      <div class="diff-opts">
        {#each DIFFS as d}
          <button class="btn diff" class:on={S.startLevel === d.level} onclick={() => setDifficulty(d.level)}>{d.label}</button>
        {/each}
      </div>
    {/if}
  </div>

  <button class="btn wide" onclick={() => ready(!mine?.ready)}>
    {mine?.ready ? "Not ready" : "I am ready"}
  </button>

  {#if mine?.host}
    <button class="btn wide primary" disabled={!canStart} onclick={start}>Start game</button>
    {#if !canStart}<p class="hint">Need at least 2 players, everyone ready.</p>{/if}
  {/if}
  <footer class="version">Klaxon v{VERSION} &middot; <a href={REPO_URL} target="_blank" rel="noopener">GitHub</a></footer>
</div>
