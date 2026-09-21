<script lang="ts">
  import { onMount } from "svelte";
  import { S, joinGame, openHelp } from "./lib/store.svelte";
  import Home from "./lib/Home.svelte";
  import Lobby from "./lib/Lobby.svelte";
  import Game from "./lib/Game.svelte";
  import GameOver from "./lib/GameOver.svelte";
  import Connecting from "./lib/Connecting.svelte";
  import Help from "./lib/Help.svelte";

  onMount(() => {
    const r = new URLSearchParams(location.search).get("r");
    if (r) {
      joinGame(r);
    } else {
      try {
        if (!localStorage.getItem("klaxon_seen_help")) {
          openHelp();
          localStorage.setItem("klaxon_seen_help", "1");
        }
      } catch { /* ignore */ }
    }
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

{#if S.connecting}
  <Connecting />
{/if}

{#if S.showHelp}
  <Help />
{/if}
