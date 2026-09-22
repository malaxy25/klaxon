<script lang="ts">
  import { S, createGame, joinByCode, updateName, openHelp, VERSION, REPO_URL } from "./store.svelte";
  let code = $state("");
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

  <footer class="version">Klaxon v{VERSION} &middot; <a href={REPO_URL} target="_blank" rel="noopener">GitHub</a></footer>
</div>
