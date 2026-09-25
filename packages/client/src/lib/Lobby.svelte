<script lang="ts">
  import QRCode from "qrcode";
  import { S, me, ready, start, setDifficulty, joinUrl, updateName, commitName, openHelp, enableMotion, kick, VERSION, REPO_URL, DONATE_URL } from "./store.svelte";

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

  let copied = $state(false);
  let copyT: ReturnType<typeof setTimeout>;
  async function copyLink() {
    const text = joinUrl();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
      } catch { /* ignore */ }
    }
    copied = true; clearTimeout(copyT); copyT = setTimeout(() => (copied = false), 1500);
  }
</script>

<div class="lobby">
  <h1>Ready room</h1>
  <p class="hint">Others join by scanning the code - same room, no download.</p>
  <button class="helplink" onclick={openHelp}>How to play</button>

  <div class="join-card">
    <div class="code">{S.code}</div>
    {#if qr}<img class="qr" src={qr} alt="Scan to join" width="220" height="220" />{/if}
    <button class="url" onclick={copyLink}>{copied ? "Link copied!" : joinUrl()}</button>
    <div class="urlhint">{copied ? "" : "tap link to copy"}</div>
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
      <li class:ready={p.ready} class:offline={!p.connected}>
        <span>{p.name}{p.host ? " - host" : ""}{p.id === S.sessionId ? " - you" : ""}</span>
        <span class="pstatus">
          {#if !p.connected}offline{:else}{p.ready ? "ready" : "waiting"}{/if}
          {#if mine?.host && p.id !== S.sessionId}
            <button class="kick" onclick={() => kick(p.id)} aria-label="remove player">x</button>
          {/if}
        </span>
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

  <div class="difficulty">
    <span class="diff-label">Motion controls (shake / tilt)</span>
    <button class="btn diff" class:on={S.motionOk} onclick={enableMotion} disabled={S.motionOk}>
      {S.motionOk ? "On" : "Enable"}
    </button>
  </div>

  <button class="btn wide" onclick={() => ready(!mine?.ready)}>
    {mine?.ready ? "Not ready" : "I am ready"}
  </button>

  {#if mine?.host}
    <button class="btn wide primary" disabled={!canStart} onclick={start}>Start game</button>
    {#if !canStart}<p class="hint">Need at least 2 players, everyone ready.</p>{/if}
  {/if}
  <button class="helplink" onclick={() => (location.href = location.pathname)}>Leave room</button>
  <footer class="version">Klaxon v{VERSION} &middot; <a href={REPO_URL} target="_blank" rel="noopener">GitHub</a>{#if DONATE_URL} &middot; <a href={DONATE_URL} target="_blank" rel="noopener">☕ Coffee</a>{/if}</footer>
</div>
