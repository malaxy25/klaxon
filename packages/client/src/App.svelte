<script lang="ts">
  import { onMount } from "svelte";
  import { S, joinGame } from "./lib/store.svelte";
  import Home from "./lib/Home.svelte";
  import Lobby from "./lib/Lobby.svelte";
  import Game from "./lib/Game.svelte";

  onMount(() => {
    const r = new URLSearchParams(location.search).get("r");
    if (r) joinGame(r);
  });
</script>

{#if S.screen === "home"}
  <Home />
{:else if S.screen === "lobby"}
  <Lobby />
{:else if S.screen === "game"}
  <Game />
{:else}
  <div class="over">
    <h1>Game over</h1>
    <p class="tagline">You reached sector {S.level}. The ship is space dust.</p>
    <button class="btn wide primary" onclick={() => (location.href = location.pathname)}>Back to start</button>
  </div>
{/if}