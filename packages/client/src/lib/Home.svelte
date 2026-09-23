<script lang="ts">
  import { S, createGame, joinByCode, updateName, openHelp, setDebug, VERSION, REPO_URL } from "./store.svelte";
  let code = $state("");

  let verTaps = 0; let verTimer: ReturnType<typeof setTimeout>;
  function tapVersion() {
    if (S.debug) { setDebug(false); verTaps = 0; alert("Debug OFF"); return; }
    verTaps++; clearTimeout(verTimer); verTimer = setTimeout(() => (verTaps = 0), 1500);
    if (verTaps >= 5) { verTaps = 0; setDebug(true); alert("Debug ON"); }
  }
</script>

<div class="home">
  <h1>Klaxon</h1>
  <p class="tagline">A cooperative shouting game for the same room. Open the page, no download.</p>

  <label class="field">
    <span>Your name</span>
    <input class="input name" maxlength="20" placeholder="Your name"
           value={S.name} oninput={(e) => updateName((e.target as HTMLInputElement).value)} />
  </label>

  <button class="btn wide primary" disabled={S.connecting} onclick={createGame}>
    {S.connecting ? "Starting..." : "Start a new game"}
  </button>

  <div class="or">or join with a code</div>
  <div class="join-row">
    <input class="input" placeholder="Room code" maxlength="6" autocapitalize="characters" autocorrect="off" spellcheck="false" style="text-transform:uppercase" value={code} oninput={(e) => (code = (e.target as HTMLInputElement).value.toUpperCase())} />
    <button class="btn" disabled={!code || S.connecting} onclick={() => joinByCode(code)}>Join</button>
  </div>

  {#if S.error}<p class="error">{S.error}</p>{/if}

  <button class="btn wide" onclick={openHelp}>How to play</button>

  <footer class="version"><button class="verbtn" onclick={tapVersion}>Klaxon v{VERSION}</button> &middot; <a href={REPO_URL} target="_blank" rel="noopener">GitHub</a>{#if S.debug} &middot; <span class="dbgon">debug</span>{/if}</footer>
</div>
<style>
  .verbtn { background: none; border: none; color: inherit; font: inherit; padding: 0; cursor: default; }
  .dbgon { color: #c98fe0; }
</style>