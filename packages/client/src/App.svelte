<script lang="ts">
  import { onMount } from "svelte";
  import { S, joinGame } from "./lib/store.svelte";
  import Home from "./lib/Home.svelte";
  import Lobby from "./lib/Lobby.svelte";
  import Game from "./lib/Game.svelte";
  import GameOver from "./lib/GameOver.svelte";

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
  <GameOver />
{/if}
