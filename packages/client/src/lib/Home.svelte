<script lang="ts">
  import { S, createGame, joinGame } from "./store.svelte";
  let code = $state("");
</script>

<div class="home">
  <h1>Spaceteam</h1>
  <p class="tagline">A cooperative shouting game for the same room. Open the page, no download.</p>

  <button class="btn wide primary" disabled={S.connecting} onclick={createGame}>
    {S.connecting ? "Starting..." : "Start a new game"}
  </button>

  <div class="or">or join with a code</div>
  <div class="join-row">
    <input class="input" placeholder="Room code" bind:value={code} />
    <button class="btn" disabled={!code || S.connecting} onclick={() => joinGame(code.trim())}>Join</button>
  </div>

  {#if S.error}<p class="error">{S.error}</p>{/if}
</div>